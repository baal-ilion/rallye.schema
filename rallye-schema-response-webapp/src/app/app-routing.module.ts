import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ListStageParamComponent } from './param/list-stage-param/list-stage-param.component';
import { ListTeamInfoComponent } from './param/list-team-info/list-team-info.component';
import { ModifyStageParamComponent } from './param/modify-stage-param/modify-stage-param.component';
import { SharingParamComponent } from './param/sharing-param/sharing-param.component';
import { ListPointComponent } from './point/list-point/list-point.component';
import { ListRankingComponent } from './point/list-ranking/list-ranking.component';
import { QrcodeComponent } from './qrcode/qrcode.component';
import { DetailsTeamStageComponent } from './stage/details-team-stage/details-team-stage.component';
import { DetailsTeamComponent } from './stage/details-team/details-team.component';
import { ListStageComponent } from './stage/list-stage/list-stage.component';
import { FormUploadComponent } from './upload/form-upload/form-upload.component';
import { ListUploadComponent } from './upload/list-upload/list-upload.component';


const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'formUpload', component: FormUploadComponent },
  { path: 'listUpload', component: ListUploadComponent },
  { path: 'listStage', component: ListStageComponent },
  { path: 'listPoint', component: ListPointComponent },
  { path: 'listRanking', component: ListRankingComponent },
  { path: 'listStageParam', component: ListStageParamComponent },
  { path: 'listTeamInfo', component: ListTeamInfoComponent },
  { path: 'stageParam/:id', component: ModifyStageParamComponent },
  { path: 'team/:id', component: DetailsTeamComponent },
  { path: 'sharingParam', component: SharingParamComponent },
  { path: 'stage/:team/:stage', component: DetailsTeamStageComponent },
  { path: 'qrcode', component: QrcodeComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
