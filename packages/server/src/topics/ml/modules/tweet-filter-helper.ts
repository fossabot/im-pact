import { BaseHelper } from './base-helper';
import * as Twitter from 'twitter';
import { SocialAccount } from 'src/social-accounts/entities/social-account.entity';
import { Repository } from 'typeorm';
import { ModuleStorage } from './module-storage';
import * as ModuleStorageEntity from '../entities/module-storage.entity';

export class TweetFilterHelper extends BaseHelper {
  private constructor(
    protected moduleName: string,
    protected moduleStorage: Readonly<ModuleStorage>,
    protected moduleSetting: any,
    protected socialAccount: SocialAccount,
    protected topicKeywords: string[],
  ) {
    super(moduleName, moduleStorage, moduleSetting, socialAccount);
  }

  /**
   * ファクトリメソッド
   */
  static readonly factory = (
    moduleName: string,
    moduleStorage: Readonly<ModuleStorage>,
    moduleSetting: any,
    socialAccount: SocialAccount,
    topicKeywords: string[],
  ): Readonly<TweetFilterHelper> => {
    return new TweetFilterHelper(moduleName, moduleStorage, moduleSetting, socialAccount, topicKeywords);
  };

  /**
   * トピックのキーワードの取得
   * (ツイートフィルタの学習にバイアスをかけたい場合などに使用する)
   */
  async getTopicKeywords(): Promise<string[]> {
    const keywords = this.topicKeywords;
    const keywordStrings = [];
    for (const keyword of keywords) {
      if (keyword.match(/"([\S\s]+)"/)) {
        keywordStrings.push(RegExp.$1);
      }
    }
    return keywordStrings;
  }
}
