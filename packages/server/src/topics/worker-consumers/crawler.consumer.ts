import { Process, Processor } from '@nestjs/bull';
import { Logger, BadRequestException } from '@nestjs/common';
import { Job, DoneCallback } from 'bull';
import { MlService } from '../ml/ml.service';
import { TwitterCrawlerService } from '../ml/twitter-crawler.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { CrawledTweet } from '../ml/entities/crawled-tweet.entity';
import { ExtractedTweet } from '../ml/entities/extracted-tweet.entity';
import { Topic } from '../entities/topic.entity';

/**
 * 収集に関するキューを処理するためのコンシューマ
 */
@Processor('crawler')
export class CrawlerConsumer {
  constructor(
    @InjectRepository(Topic)
    private topicsRepository: Repository<Topic>,
    @InjectRepository(CrawledTweet)
    private crawledTweetRepository: Repository<CrawledTweet>,
    @InjectRepository(ExtractedTweet)
    private extractedTweetRepository: Repository<ExtractedTweet>,
    private mlService: MlService,
    private twitterCrawlerService: TwitterCrawlerService,
  ) {}

  /**
   * ツイートの収集を実行するためのジョブの処理
   * (@nestjs/bull から 'crawler' キューを介して呼び出される)
   * @param job ジョブ
   */
  @Process()
  async execJob(job: Job<any>) {
    Logger.debug(`Job starting... (ID: ${job.id})`, 'CrawlerConsumer/execJob');
    const topicId = job.data.topicId;
    try {
      const tweets = await this.crawl(topicId, job);
      Logger.debug(`Job completed... (ID: ${job.id})`, 'CrawlerConsumer/execJob');
      return tweets;
    } catch (e) {
      Logger.error(`Error has occurred in job... (ID: ${job.id})`, e.stack, 'CrawlerConsumer/execJob');
      throw e;
    }
  }

  /**
   * 指定されたトピックにおけるツイートの収集
   * @param id トピックID
   * @param job ジョブ
   * @return 分類されたツイートの配列
   */
  async crawl(id: number, job?: Job<any>): Promise<ExtractedTweet[]> {
    // トピックを取得
    const topic: Topic = await this.topicsRepository.findOne(id, {
      relations: ['crawlSocialAccount'],
    });
    if (topic === undefined) {
      throw new BadRequestException('Invalid item');
    }

    // フィルタパターンを取得
    if (!topic.filterPatterns[topic.enabledFilterPatternIndex]) {
      throw new BadRequestException('Invalid filter pattern');
    }
    const filterPatern = JSON.parse(topic.filterPatterns[topic.enabledFilterPatternIndex]);
    const filterSettings = filterPatern.filters;

    // 学習モデルを取得
    const trainedModelId = filterPatern.trainedModelId;
    if (!trainedModelId) {
      throw new BadRequestException('trainedModel not registered');
    }

    // ジョブのステータスを更新
    job?.progress(10);

    // 未分類ツイートを取得 (併せて収集も実行)
    let unextractedTweets = await this.getUnextractedTweets(topic);

    // ジョブのステータスを更新
    job?.progress(50);

    // 未分類ツイートを分類
    const predictedTweets = await this.mlService.predictTweets(
      trainedModelId,
      unextractedTweets,
      filterSettings,
      topic.searchCondition.keywords,
    );

    // ジョブのステータスを更新
    job?.progress(75);

    // 分類されたツイートを反復
    const savedTweets = [],
      savedTweetIds = [];
    for (const tweet of predictedTweets) {
      // 当該ツイートを登録
      console.log(`[TopicService] crawl - Inserting extracted tweets... ${tweet.idStr}`);
      tweet.predictedClass = tweet.predictedSelect ? 'accept' : 'reject';
      tweet.filtersResult = tweet.filtersResult;
      tweet.topic = topic.id;
      try {
        savedTweets.push(await this.extractedTweetRepository.save(tweet));
        savedTweetIds.push(tweet.idStr);
      } catch (e) {
        console.warn(e);
      }
    }

    // ジョブの収集済みツイート情報を更新
    if (job) job.update({ topicId: topic.id, tweetIds: savedTweetIds });

    // ジョブのステータスを更新
    job?.progress(100);

    // 分類されたツイートを返す
    console.log(`[TopicService] crawl - Done`);
    return savedTweets;
  }

  /**
   * 指定されたトピックにおける未分類ツイートの取得・収集
   * @param topic トピック
   * @param numOfRequestTweets 要求するツイート件数
   * @return 未分類ツイートの配列
   */
  private async getUnextractedTweets(topic: Topic, numOfRequestTweets = 50): Promise<CrawledTweet[]> {
    // ツイートを収集
    await this.twitterCrawlerService.crawlTweets(
      topic.crawlSocialAccount.id,
      topic.searchCondition,
      numOfRequestTweets * 3 * topic.searchCondition.keywords.length,
    );

    // トピックのキーワードを再度反復
    let tweets = [];
    for (const keyword of topic.searchCondition.keywords) {
      // 当該キーワードにて最近収集されたツイートを検索
      const NUM_OF_MAX_FIND_TWEETS_OF_EACH_KEYWORD = numOfRequestTweets * 10;
      const RANGE_OF_HOURS_TO_FIND = 24; // 24時間前に収集したツイートまで

      let whereCrawledAt = new Date();
      whereCrawledAt.setHours(RANGE_OF_HOURS_TO_FIND * -1);

      const tweetsOfThisKeyword = await this.crawledTweetRepository.find({
        where: {
          crawlQuery: this.twitterCrawlerService.getQueryBySearchConditionAndKeyword(topic.searchCondition, keyword),
          crawlLanguage: topic.searchCondition.language,
          crawledAt: MoreThanOrEqual(whereCrawledAt),
        },
        order: {
          crawledAt: 'ASC',
        },
        //take: NUM_OF_MAX_FIND_TWEETS_OF_EACH_KEYWORD,
      });
      tweets = tweets.concat(tweetsOfThisKeyword);
    }

    console.log(`[TopicService] getUnextractedTweets - Found tweets... ${tweets.length}`);

    // 最近収集されたツイートから分類済みのものを除く
    await Promise.all(
      tweets.map(
        async tweet =>
          (
            await this.extractedTweetRepository.find({
              where: {
                topic: topic.id,
                idStr: tweet.idStr,
              },
            })
          ).length,
      ),
    ).then(
      findResults =>
        (tweets = tweets.filter((tweet, index) => {
          if (0 < findResults[index]) return false;
          return true;
        })),
    );

    // 重複を除去
    tweets = tweets.filter((item, i, self) => {
      return (
        self.findIndex(item_ => {
          return item.idStr == item_.idStr;
        }) === i
      );
    });

    console.log(`[TopicService] getUnextractedTweets - Found unextracted tweets... ${tweets.length}`);

    // 指定件数まで減らす
    if (numOfRequestTweets < tweets.length) {
      tweets = tweets.slice(0, numOfRequestTweets);
    }

    // 未分類のツイートを返す
    return tweets;
  }
}
