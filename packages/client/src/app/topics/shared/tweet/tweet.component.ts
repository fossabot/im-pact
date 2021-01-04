import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-tweet',
  templateUrl: './tweet.component.html',
  styleUrls: ['./tweet.component.scss'],
})
export class TweetComponent implements OnInit {
  @Input() tweet: any;
  @Output() onSelectChangedEvent = new EventEmitter<boolean>();
  isSelected = false;
  // ツイートのデータ
  rawData: any;

  constructor() {}

  ngOnInit(): void {
    this.rawData = JSON.parse(this.tweet.rawJSONData);
  }

  /**
   * 分類ボタンがクリックされたときに呼び出されるリスナ
   */
  onClassificationButtonClicked() {
    this.isSelected = !this.isSelected;
    this.onSelectChangedEvent.emit(this.isSelected);
  }
}
