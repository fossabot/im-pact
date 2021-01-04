import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatListModule } from '@angular/material/list';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';

import { TopicsRoutingModule } from './topics-routing.module';
import { TopicEditorComponent } from './topic-editor/topic-editor.component';
import { ModuleChooserSheetComponent } from './topic-editor/module-chooser-sheet/module-chooser-sheet.component';
import { TrainerDialogComponent } from './topic-editor/trainer-dialog/trainer-dialog.component';
import { TweetComponent } from './shared/tweet/tweet.component';
import { TrainingDialogComponent } from './topic-editor/training-dialog/training-dialog.component';

@NgModule({
  declarations: [TopicEditorComponent, ModuleChooserSheetComponent, TrainerDialogComponent, TweetComponent, TrainingDialogComponent],
  imports: [
    CommonModule,
    FormsModule,
    TopicsRoutingModule,

    // Angular Material
    MatAutocompleteModule,
    MatButtonModule,
    MatBottomSheetModule,
    MatChipsModule,
    MatCheckboxModule,
    MatCardModule,
    MatFormFieldModule,
    MatGridListModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatMenuModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatTabsModule,
    MatToolbarModule,
    MatTooltipModule,
    MatDatepickerModule,
  ],
  exports: [TopicEditorComponent],
})
export class TopicsModule {}
