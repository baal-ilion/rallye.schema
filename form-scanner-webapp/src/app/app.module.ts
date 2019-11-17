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
import { ListResponseFileParamComponent } from './response-file/param/list-response-file-param/list-response-file-param.component';
import { DetailsResponseFileParamComponent } from './response-file/param/details-response-file-param/details-response-file-param.component';
import { ModifyResponseFileParamComponent } from './response-file/param/modify-response-file-param/modify-response-file-param.component';
import { DetailsTemplateComponent } from './response-file/common/details-template/details-template.component';
import { DetailsTemplateParamComponent } from './response-file/param/details-template-param/details-template-param.component';
import { ListPointComponent } from './point/list-point/list-point.component';
import { DetailsPointComponent } from './point/details-point/details-point.component';
import { DetailsStageParamComponent } from './param/details-stage-param/details-stage-param.component';
import { ListStageParamComponent } from './param/list-stage-param/list-stage-param.component';

@NgModule({
  declarations: [
    AppComponent,
    FormUploadComponent,
    ListUploadComponent,
    DetailsUploadComponent,
    DetailsStageComponent,
    ListStageComponent,
    ModifyUploadComponent,
    ListResponseFileParamComponent,
    DetailsResponseFileParamComponent,
    ModifyResponseFileParamComponent,
    DetailsTemplateComponent,
    DetailsTemplateParamComponent,
    ListPointComponent,
    DetailsPointComponent,
    DetailsStageParamComponent,
    ListStageParamComponent
  ],
  entryComponents: [ModifyUploadComponent, ModifyResponseFileParamComponent],
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
