import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FormUploadComponent } from './upload/form-upload/form-upload.component';
import { ListUploadComponent } from './upload/list-upload/list-upload.component';
import { DetailsUploadComponent } from './upload/details-upload/details-upload.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { UiSwitchModule } from 'ngx-ui-switch';
import { DetailsStageComponent } from './stage/details-stage/details-stage.component';
import { ListStageComponent } from './stage/list-stage/list-stage.component';
import { ModifyUploadComponent } from './upload/modify-upload/modify-upload.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DetailsResponseFileParamComponent } from './response-file/param/details-response-file-param/details-response-file-param.component';
import { ModifyResponseFileParamComponent } from './response-file/param/modify-response-file-param/modify-response-file-param.component';
import { DetailsTemplateComponent } from './response-file/common/details-template/details-template.component';
import { DetailsTemplateParamComponent } from './response-file/param/details-template-param/details-template-param.component';
import { ListPointComponent } from './point/list-point/list-point.component';
import { DetailsPointComponent } from './point/details-point/details-point.component';
import { DetailsStageParamComponent } from './param/details-stage-param/details-stage-param.component';
import { ListStageParamComponent } from './param/list-stage-param/list-stage-param.component';
import { MenuComponent } from './menu/menu.component';
import { DetailsResponseFileComponent } from './upload/details-response-file/details-response-file.component';
import { ListTeamInfoComponent } from './param/list-team-info/list-team-info.component';
import { ModifyTeamInfoComponent } from './param/modify-team-info/modify-team-info.component';
import { ModifyStageParamComponent } from './param/modify-stage-param/modify-stage-param.component';
import { NewStageParamComponent } from './param/new-stage-param/new-stage-param.component';
import { ConfirmationDialogComponent } from './confirmation-dialog/confirmation-dialog.component';

@NgModule({
  declarations: [
    AppComponent,
    FormUploadComponent,
    ListUploadComponent,
    DetailsUploadComponent,
    DetailsStageComponent,
    ListStageComponent,
    ModifyUploadComponent,
    DetailsResponseFileParamComponent,
    ModifyResponseFileParamComponent,
    DetailsTemplateComponent,
    DetailsTemplateParamComponent,
    ListPointComponent,
    DetailsPointComponent,
    DetailsStageParamComponent,
    ListStageParamComponent,
    MenuComponent,
    DetailsResponseFileComponent,
    ListTeamInfoComponent,
    ModifyTeamInfoComponent,
    ModifyStageParamComponent,
    NewStageParamComponent,
    ConfirmationDialogComponent
  ],
  entryComponents: [
    ModifyUploadComponent,
    ModifyResponseFileParamComponent,
    ModifyTeamInfoComponent,
    NewStageParamComponent,
    ConfirmationDialogComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    BrowserAnimationsModule,
    DragDropModule,
    NgbModule,
    UiSwitchModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
