import { Process, Processor } from '@nestjs/bull';
import { Logger, BadRequestException } from '@nestjs/common';
import { Job } from 'bull';
import { MlService } from '../ml/ml.service';
import { InjectRepository } from '@nestjs/typeorm';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { CrawledTweet } from '../ml/entities/crawled-tweet.entity';
import { ExtractedTweet } from '../ml/entities/extracted-tweet.entity';
import { Topic } from '../entities/topic.entity';
import { TrainAndValidateDto } from '../ml/dto/train-and-validate.dto';
import { ReTrainDto } from '../ml/dto/retrain.dto';

/**
 * 再トレーニングに関するキューを処理するためのコンシューマ
 */
@Processor('retrainer')
export class RetrainerConsumer {
  constructor(
    @InjectRepository(Topic)
    private topicsRepository: Repository<Topic>,
    @InjectRepository(CrawledTweet)
    private crawledTweetRepository: Repository<CrawledTweet>,
    @InjectRepository(ExtractedTweet)
    private extractedTweetRepository: Repository<ExtractedTweet>,
    private mlService: MlService,
  ) {}

  /**
   * 指定されたツイートを元にした再トレーニングのためのジョブの処理
   * (@nestjs/bull から 'retrainer' キューを介して呼び出される)
   * @param job ジョブ
   */
  @Process()
  async execJob(job: Job<any>) {
    Logger.debug(`Job starting... (ID: ${job.id})`, 'RetrainerConsumer/execJob');
    const dto: ReTrainDto = job.data.dto;

    try {
      const result = await this.retrain(dto, job);
      Logger.debug(`Job completed... (ID: ${job.id})`, 'RetrainerConsumer/execJob');
      return result;
    } catch (e) {
      Logger.error(`Error has occurred in job... (ID: ${job.id})`, e.stack, 'RetrainerConsumer/execJob');
      throw e;
    }
  }

  /**
   * 再トレーニング
   * @param dto 再トレーニングを行うための情報
   * @param job ジョブ
   */
  async retrain(dto: ReTrainDto, job: Job<any>) {
    // トピックを取得
    let topic: Topic = await this.topicsRepository.findOne(dto.topicId);
    if (!topic) throw new Error('topic not found');

    // ツイートを取得
    const tweet: ExtractedTweet = await this.extractedTweetRepository.findOne(dto.tweet.id);
    if (!tweet) {
      throw new Error('tweet not found');
    }

    // 当該ツイートが選択されたか否か
    const isSelected = tweet.predictedClass == 'accept';

    // トピックのお手本分類を確認
    let foundTweet = false;
    topic.trainingTweets = topic.trainingTweets.map((trainingTweetJSON: string) => {
      const trainingTweet = JSON.parse(trainingTweetJSON);
      if (trainingTweet.idStr != tweet.idStr) {
        // 当該ツイートでなければ何もしない
        return trainingTweetJSON;
      }
      // お手本分類の当該ツイートを更新
      foundTweet = true;
      trainingTweet.selected = isSelected;
      return JSON.stringify(trainingTweet);
    });

    if (!foundTweet) {
      // お手本分類に当該ツイートがまだなければ、当該ツイートの元となった収集済みツイートをデータベースから取得
      const crawledTweets = await this.crawledTweetRepository.find({
        where: {
          //socialAccount: tweet.socialAccount,
          crawlQuery: tweet.crawlQuery,
          idStr: tweet.idStr,
        },
      });
      if (crawledTweets.length <= 0) throw new Error('Crawled tweet not found');
      const crawledTweet = crawledTweets[0] as any; // お手本分類のツイートにするために any とする
      // 収集済みツイートをお手本分類へ追加
      crawledTweet.selected = isSelected;
      topic.trainingTweets.push(JSON.stringify(crawledTweet));
    }

    // トピックを上書き
    await topic.save();

    // トピックのツイートフィルタパターンを取得
    if (!topic.enabledFilterPatternIndex || !topic.filterPatterns[topic.enabledFilterPatternIndex]) {
      throw new Error('Invalid filter pattern');
    }
    let filterPattern = JSON.parse(topic.filterPatterns[topic.enabledFilterPatternIndex]);

    // ジョブのステータスを更新
    job.progress(10);

    // ツイートフィルタの再トレーニング
    // TODO:

    // トレーニング＆検証を再実行
    const trainAndValidateDto: TrainAndValidateDto = {
      topicId: dto.topicId,
      trainingTweets: topic.trainingTweets.map(trainingTweetJSON => {
        return JSON.parse(trainingTweetJSON);
      }),
      filters: filterPattern.filters,
      topicKeywords: topic.searchCondition.keywords,
    };
    const result = await this.mlService.trainAndValidate(trainAndValidateDto);
    // ジョブのステータスを更新
    job.progress(60);

    // トピックを再取得
    topic = await this.topicsRepository.findOne(dto.topicId);
    if (!topic) throw new Error('Topic is null');

    // トピックのツイートフィルタパターンの学習モデルIDおよびスコアを更新
    filterPattern = JSON.parse(topic.filterPatterns[topic.enabledFilterPatternIndex]);
    filterPattern.trainedModelId = result.trainingResult.trainedModelId;
    filterPattern.score = result.validationResult.score;
    topic.filterPatterns[topic.enabledFilterPatternIndex] = JSON.stringify(filterPattern);
    await topic.save();

    // 当該ツイートを再分類
    const predictedTweets = await this.mlService.predictTweets(
      filterPattern.trainedModelId,
      [tweet],
      filterPattern.filters,
      topic.searchCondition.keywords,
    );

    // 分類されたツイートを取得してデータベースを更新
    const predictedTweet = predictedTweets[0];
    Logger.debug(
      `Updating extracted tweet... (ID: ${tweet.id}, predictedClass after retraining: ${predictedTweet.predictedClass})`,
      'TrainerConsumer/execRetrainerJob',
    );
    tweet.filtersResult = predictedTweet.filtersResult;
    await tweet.save();

    // ジョブのステータスを更新
    job.progress(100);

    // 再分類の結果を返す
    return predictedTweet;
  }
}
