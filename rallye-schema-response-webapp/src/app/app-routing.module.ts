import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { FormUploadComponent } from './upload/form-upload/form-upload.component';
import { ListUploadComponent } from './upload/list-upload/list-upload.component';
import { ListStageComponent } from './stage/list-stage/list-stage.component';
import { ListPointComponent } from './point/list-point/list-point.component';
import { ListStageParamComponent } from './param/list-stage-param/list-stage-param.component';
import { ListTeamInfoComponent } from './param/list-team-info/list-team-info.component';
import { ModifyStageParamComponent } from './param/modify-stage-param/modify-stage-param.component';
import { DetailsTeamComponent } from './stage/details-team/details-team.component';
import { SharingParamComponent } from './param/sharing-param/sharing-param.component';


const routes: Routes = [
  { path: '', component: FormUploadComponent },
  { path: 'formUpload', component: FormUploadComponent },
  { path: 'listUpload', component: ListUploadComponent },
  { path: 'listStage', component: ListStageComponent },
  { path: 'listPoint', component: ListPointComponent },
  { path: 'listStageParam', component: ListStageParamComponent },
  { path: 'listTeamInfo', component: ListTeamInfoComponent },
  { path: 'stageParam/:id', component: ModifyStageParamComponent },
  { path: 'team/:id', component: DetailsTeamComponent },
  { path: 'sharingParam', component: SharingParamComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
