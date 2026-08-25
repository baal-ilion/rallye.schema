import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ListChallengeGroupComponent } from './configuration/list-challenge-group/list-challenge-group.component';
import { ListChallengeConfigurationComponent } from './configuration/list-challenge-configuration/list-challenge-configuration.component';
import { ListTeamComponent } from './configuration/list-team/list-team.component';
import { ModifyChallengeConfigurationComponent } from './configuration/modify-challenge-configuration/modify-challenge-configuration.component';
import { ConfigurationTransferComponent } from './configuration/configuration-transfer/configuration-transfer.component';
import { ListPointComponent } from './scoring/list-point/list-point.component';
import { ListRankingComponent } from './scoring/list-ranking/list-ranking.component';
import { GroupRankingComponent } from './scoring/group-ranking/group-ranking.component';
import { PrizeDistributionComponent } from './scoring/prize-distribution/prize-distribution.component';
import { TeamQrCodeComponent } from './team-qr-code/team-qr-code.component';
import { DetailsTeamChallengeComponent } from './challenge/details-team-challenge/details-team-challenge.component';
import { ListChallengeComponent } from './challenge/list-challenge/list-challenge.component';
import { ScannedFormImportComponent } from './form-processing/scanned-form-import/scanned-form-import.component';
import { FormCaptureComponent } from './form-processing/form-capture/form-capture.component';
import { FormProcessingWorkspaceComponent } from './form-processing/form-processing-workspace/form-processing-workspace.component';
import { TeamPresenceComponent } from './configuration/team-presence/team-presence.component';
import { ChallengeParticipationComponent } from './challenge/challenge-participation/challenge-participation.component';
import { TeamProgressComponent } from './challenge/team-progress/team-progress.component';
import { TeamActiveChallengesComponent } from './challenge/team-active-challenges/team-active-challenges.component';
import { StatisticsComponent } from './statistics/statistics.component';
import { GameManagementComponent } from './game-management/game-management.component';
import { DatabaseMaintenanceComponent } from './database/database-maintenance/database-maintenance.component';


const routes: Routes = [
  // Accueil
  { path: '', component: HomeComponent },

  // Gestion du rallye
  { path: 'challenges/participation', component: ChallengeParticipationComponent },
  { path: 'teams/progression', component: TeamProgressComponent },
  { path: 'teams/active-challenges', component: TeamActiveChallengesComponent },
  { path: 'game-management', component: GameManagementComponent },

  // Correction des formulaires et validation des épreuves
  { path: 'forms/import-scans', component: ScannedFormImportComponent },
  { path: 'forms/capture', component: FormCaptureComponent },
  { path: 'forms/processing', component: FormProcessingWorkspaceComponent },
  { path: 'challenges/validation', component: ListChallengeComponent },

  // Points et classements
  { path: 'scoring/details', component: ListPointComponent },
  { path: 'rankings', component: ListRankingComponent },
  { path: 'rankings/groups', component: GroupRankingComponent },
  { path: 'prizes', component: PrizeDistributionComponent },

  // Paramétrage
  { path: 'configuration/challenge-groups', component: ListChallengeGroupComponent },
  { path: 'configuration/challenges', component: ListChallengeConfigurationComponent },
  { path: 'configuration/teams', component: ListTeamComponent },
  { path: 'teams/presence', component: TeamPresenceComponent },
  { path: 'configuration/challenges/:id', component: ModifyChallengeConfigurationComponent },
  { path: 'configuration-transfer', component: ConfigurationTransferComponent },

  // Pages transverses et routes techniques.
  { path: 'challenge/:team/:challenge', component: DetailsTeamChallengeComponent },
  { path: 'team-qr-codes', component: TeamQrCodeComponent },
  { path: 'statistics', component: StatisticsComponent },
  { path: 'database', component: DatabaseMaintenanceComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
