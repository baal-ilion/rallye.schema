import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { FormUploadComponent } from './upload/form-upload/form-upload.component';
import { ListUploadComponent } from './upload/list-upload/list-upload.component';
import { ListStageComponent } from './stage/list-stage/list-stage.component';
import { ListPointComponent } from './point/list-point/list-point.component';
import { ListResponseFileParamComponent } from './response-file/param/list-response-file-param/list-response-file-param.component';
import { ListStageParamComponent } from './param/list-stage-param/list-stage-param.component';


const routes: Routes = [
  { path: '', component: FormUploadComponent },
  { path: 'formUpload', component: FormUploadComponent },
  { path: 'listUpload', component: ListUploadComponent },
  { path: 'listStage', component: ListStageComponent },
  { path: 'listPoint', component: ListPointComponent },
  { path: 'listResponseFileParam', component: ListResponseFileParamComponent },
  { path: 'listStageParam', component: ListStageParamComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
