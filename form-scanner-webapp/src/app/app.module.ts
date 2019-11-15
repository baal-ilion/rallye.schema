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
import { ListResponceFileParamComponent } from './responce-file/param/list-responce-file-param/list-responce-file-param.component';
import { DetailsResponceFileParamComponent } from './responce-file/param/details-responce-file-param/details-responce-file-param.component';
import { ModifyResponceFileParamComponent } from './responce-file/param/modify-responce-file-param/modify-responce-file-param.component';
import { DetailsTemplateComponent } from './responce-file/common/details-template/details-template.component';
import { DetailsTemplateParamComponent } from './responce-file/param/details-template-param/details-template-param.component';
import { ListPointComponent } from './point/list-point/list-point.component';
import { DetailsPointComponent } from './point/details-point/details-point.component';

@NgModule({
  declarations: [
    AppComponent,
    FormUploadComponent,
    ListUploadComponent,
    DetailsUploadComponent,
    DetailsStageComponent,
    ListStageComponent,
    ModifyUploadComponent,
    ListResponceFileParamComponent,
    DetailsResponceFileParamComponent,
    ModifyResponceFileParamComponent,
    DetailsTemplateComponent,
    DetailsTemplateParamComponent,
    ListPointComponent,
    DetailsPointComponent
  ],
  entryComponents: [ModifyUploadComponent, ModifyResponceFileParamComponent],
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
