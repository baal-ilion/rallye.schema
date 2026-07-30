import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ListStageGroupComponent } from './param/list-stage-group/list-stage-group.component';
import { ListStageParamComponent } from './param/list-stage-param/list-stage-param.component';
import { ListTeamInfoComponent } from './param/list-team-info/list-team-info.component';
import { ModifyStageParamComponent } from './param/modify-stage-param/modify-stage-param.component';
import { SharingParamComponent } from './param/sharing-param/sharing-param.component';
import { ListPointComponent } from './point/list-point/list-point.component';
import { ListRankingComponent } from './point/list-ranking/list-ranking.component';
import { GroupRankingComponent } from './point/group-ranking/group-ranking.component';
import { PrizeDistributionComponent } from './point/prize-distribution/prize-distribution.component';
import { QrcodeComponent } from './qrcode/qrcode.component';
import { DetailsTeamStageComponent } from './stage/details-team-stage/details-team-stage.component';
import { ListStageComponent } from './stage/list-stage/list-stage.component';
import { FormUploadComponent } from './upload/form-upload/form-upload.component';
import { FormCaptureComponent } from './upload/form-capture/form-capture.component';
import { ListUploadComponent } from './upload/list-upload/list-upload.component';
import { TeamPresenceComponent } from './param/team-presence/team-presence.component';
import { StageParticipationComponent } from './stage/stage-participation/stage-participation.component';
import { TeamProgressComponent } from './stage/team-progress/team-progress.component';
import { TeamActiveStagesComponent } from './stage/team-active-stages/team-active-stages.component';
import { StatsComponent } from './stats/stats.component';
import { ArbitrageComponent } from './arbitrage/arbitrage.component';
import { DatabaseMaintenanceComponent } from './database/database-maintenance/database-maintenance.component';


const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'formUpload', component: FormUploadComponent },
  { path: 'formCapture', component: FormCaptureComponent },
  { path: 'listUpload', component: ListUploadComponent },
  { path: 'listStage', component: ListStageComponent },
  { path: 'listPoint', component: ListPointComponent },
  { path: 'listRanking', component: ListRankingComponent },
  { path: 'groupRanking', component: GroupRankingComponent },
  { path: 'prizes', component: PrizeDistributionComponent },
  { path: 'listStageParam', component: ListStageParamComponent },
  { path: 'listTeamInfo', component: ListTeamInfoComponent },
  { path: 'teams/presence', component: TeamPresenceComponent },
  { path: 'teams/progression', component: TeamProgressComponent },
  { path: 'teams/active-stages', component: TeamActiveStagesComponent },
  { path: 'stages/participation', component: StageParticipationComponent },
  { path: 'stats', component: StatsComponent },
  { path: 'arbitrage', component: ArbitrageComponent },
  { path: 'stageParam/:id', component: ModifyStageParamComponent },
  { path: 'sharingParam', component: SharingParamComponent },
  { path: 'stage/:team/:stage', component: DetailsTeamStageComponent },
  { path: 'qrcode', component: QrcodeComponent },
  { path: 'listStageGroup', component: ListStageGroupComponent },
  { path: 'database', component: DatabaseMaintenanceComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
