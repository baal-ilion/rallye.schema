import { DragDropModule } from '@angular/cdk/drag-drop';
import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import localeFrExtra from '@angular/common/locales/extra/fr';
import localeFr from '@angular/common/locales/fr';
import { APP_INITIALIZER, LOCALE_ID, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogModule } from '@angular/material/dialog';
import { QRCodeModule } from 'angularx-qrcode';
import { AppConfigService } from './app-config.service';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ConfirmationDialogComponent } from './confirmation-dialog/confirmation-dialog.component';
import { HomeComponent } from './home/home.component';
import { LocaleService } from './locale.service';
import { LogFilesComponent } from './logs/log-files/log-files.component';
import { NavigationComponent } from './navigation/navigation.component';
import { ListChallengeConfigurationComponent } from './configuration/list-challenge-configuration/list-challenge-configuration.component';
import { ListTeamComponent } from './configuration/list-team/list-team.component';
import { ModifyPerformanceScoringRangeComponent } from './configuration/modify-performance-scoring-range/modify-performance-scoring-range.component';
import { ModifyChallengeConfigurationComponent } from './configuration/modify-challenge-configuration/modify-challenge-configuration.component';
import { ModifyTeamComponent } from './configuration/modify-team/modify-team.component';
import { NewChallengeConfigurationComponent } from './configuration/new-challenge-configuration/new-challenge-configuration.component';
import { ConfigurationTransferComponent } from './configuration/configuration-transfer/configuration-transfer.component';
import { DetailsPointComponent } from './scoring/details-point/details-point.component';
import { ListPointComponent } from './scoring/list-point/list-point.component';
import { ListRankingComponent } from './scoring/list-ranking/list-ranking.component';
import { RankingComponent } from './scoring/ranking/ranking.component';
import { GroupRankingComponent } from './scoring/group-ranking/group-ranking.component';
import { ChallengeParticipationComponent } from './challenge/challenge-participation/challenge-participation.component';
import { TeamProgressComponent } from './challenge/team-progress/team-progress.component';
import { TeamProgressDetailsComponent } from './challenge/team-progress-details/team-progress-details.component';
import { TeamActiveChallengesComponent } from './challenge/team-active-challenges/team-active-challenges.component';
import { StatisticsComponent } from './statistics/statistics.component';
import { PrizeDistributionComponent } from './scoring/prize-distribution/prize-distribution.component';
import { TeamQrCodeComponent } from './team-qr-code/team-qr-code.component';
import { DetailsTemplateComponent } from './form-recognition/common/details-template/details-template.component';
import { DetailsFormRecognitionConfigurationComponent } from './form-recognition/configuration/details-form-recognition-configuration/details-form-recognition-configuration.component';
import { FormTemplatePreviewComponent } from './form-recognition/configuration/form-template-preview/form-template-preview.component';
import { ModifyFormRecognitionConfigurationComponent } from './form-recognition/configuration/modify-form-recognition-configuration/modify-form-recognition-configuration.component';
import { DetailsChallengeComponent } from './challenge/details-challenge/details-challenge.component';
import { DetailsTeamChallengeComponent } from './challenge/details-team-challenge/details-team-challenge.component';
import { ListChallengeComponent } from './challenge/list-challenge/list-challenge.component';
import { ToggleSwitchComponent } from './toggle-switch/toggle-switch.component';
import { DetailsSubmittedFormComponent } from './form-processing/details-submitted-form/details-submitted-form.component';
import { FormVerificationComponent } from './form-processing/form-verification/form-verification.component';
import { ScannedFormImportComponent } from './form-processing/scanned-form-import/scanned-form-import.component';
import { FormCaptureComponent } from './form-processing/form-capture/form-capture.component';
import { ListSubmittedFormComponent } from './form-processing/list-submitted-form/list-submitted-form.component';
import { FormProcessingWorkspaceComponent } from './form-processing/form-processing-workspace/form-processing-workspace.component';
import { FormIdentificationEditorComponent } from './form-processing/form-identification-editor/form-identification-editor.component';
import { SubmittedFormActionsComponent } from './form-processing/submitted-form-actions/submitted-form-actions.component';
import { TeamPresenceComponent } from './configuration/team-presence/team-presence.component';
import { RouterModule } from '@angular/router';
import { ListChallengeGroupComponent } from './configuration/list-challenge-group/list-challenge-group.component';
import { ModifyChallengeGroupComponent } from './configuration/modify-challenge-group/modify-challenge-group.component';
import { PaginationComponent } from './shared/pagination/pagination.component';
import { GameManagementComponent } from './game-management/game-management.component';
import { DatabaseMaintenanceComponent } from './database/database-maintenance/database-maintenance.component';
import { SyncTableColumnsDirective } from './shared/sync-table-columns.directive';

registerLocaleData(localeFr, 'fr', localeFrExtra);

@NgModule({ declarations: [
        AppComponent,
        ScannedFormImportComponent,
        FormCaptureComponent,
        FormProcessingWorkspaceComponent,
        FormVerificationComponent,
        DetailsChallengeComponent,
        ListChallengeComponent,
        FormIdentificationEditorComponent,
        DetailsFormRecognitionConfigurationComponent,
        ModifyFormRecognitionConfigurationComponent,
        DetailsTemplateComponent,
        FormTemplatePreviewComponent,
        ListPointComponent,
        DetailsPointComponent,
        ListChallengeGroupComponent,
        ModifyChallengeGroupComponent,
        ListChallengeConfigurationComponent,
        NavigationComponent,
        DetailsSubmittedFormComponent,
        ListTeamComponent,
        ChallengeParticipationComponent,
        ModifyTeamComponent,
        TeamPresenceComponent,
        ModifyChallengeConfigurationComponent,
        NewChallengeConfigurationComponent,
        ConfirmationDialogComponent,
        ListSubmittedFormComponent,
        ConfigurationTransferComponent,
        RankingComponent,
        ListRankingComponent,
        GroupRankingComponent,
        PrizeDistributionComponent,
        DatabaseMaintenanceComponent,
        TeamProgressComponent,
        TeamProgressDetailsComponent,
        TeamActiveChallengesComponent,
        StatisticsComponent,
        DetailsTeamChallengeComponent,
        SubmittedFormActionsComponent,
        ModifyPerformanceScoringRangeComponent,
        GameManagementComponent,
        LogFilesComponent,
        ToggleSwitchComponent,
        HomeComponent,
        TeamQrCodeComponent,
        PaginationComponent,
        SyncTableColumnsDirective,
    ],
    bootstrap: [AppComponent], imports: [BrowserModule,
        RouterModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        DragDropModule,
        MatDialogModule,
        FormsModule,
        ReactiveFormsModule,
        QRCodeModule], providers: [
        {
            provide: LOCALE_ID,
            useFactory: (localeService: LocaleService) => {
                console.log('locale ID', localeService.getLanguage());
                return localeService.getLanguage();
            },
            deps: [LocaleService]
        },
        AppConfigService,
        { provide: APP_INITIALIZER, useFactory: initializeApp, deps: [AppConfigService], multi: true },
        provideHttpClient(withInterceptorsFromDi())
    ] })
export class AppModule { }

export function initializeApp(appConfigService: AppConfigService) {
  return (): Promise<any> => {
    return appConfigService.load();
  };
}
