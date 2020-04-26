import { DragDropModule } from '@angular/cdk/drag-drop';
import { registerLocaleData } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import localeFrExtra from '@angular/common/locales/extra/fr';
import localeFr from '@angular/common/locales/fr';
import { APP_INITIALIZER, LOCALE_ID, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { UiSwitchModule } from 'ngx-ui-switch';
import { AppConfigService } from './app-config.service';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ConfirmationDialogComponent } from './confirmation-dialog/confirmation-dialog.component';
import { LocaleService } from './locale.service';
import { MenuComponent } from './menu/menu.component';
import { ListStageParamComponent } from './param/list-stage-param/list-stage-param.component';
import { ListTeamInfoComponent } from './param/list-team-info/list-team-info.component';
import { ModifyStageParamComponent } from './param/modify-stage-param/modify-stage-param.component';
import { ModifyTeamInfoComponent } from './param/modify-team-info/modify-team-info.component';
import { NewStageParamComponent } from './param/new-stage-param/new-stage-param.component';
import { SharingParamComponent } from './param/sharing-param/sharing-param.component';
import { DetailsPointComponent } from './point/details-point/details-point.component';
import { ListPointComponent } from './point/list-point/list-point.component';
import { ListRankingComponent } from './point/list-ranking/list-ranking.component';
import { RankingComponent } from './point/ranking/ranking.component';
import { DetailsTemplateComponent } from './response-file/common/details-template/details-template.component';
import { DetailsResponseFileParamComponent } from './response-file/param/details-response-file-param/details-response-file-param.component';
import { DetailsTemplateParamComponent } from './response-file/param/details-template-param/details-template-param.component';
import { ModifyResponseFileParamComponent } from './response-file/param/modify-response-file-param/modify-response-file-param.component';
import { DetailsStageComponent } from './stage/details-stage/details-stage.component';
import { DetailsTeamStageComponent } from './stage/details-team-stage/details-team-stage.component';
import { DetailsTeamComponent } from './stage/details-team/details-team.component';
import { ListStageComponent } from './stage/list-stage/list-stage.component';
import { CarouselResponseFileComponent } from './upload/carousel-response-file/carousel-response-file.component';
import { DetailsResponseFileComponent } from './upload/details-response-file/details-response-file.component';
import { DetailsUploadComponent } from './upload/details-upload/details-upload.component';
import { FormUploadComponent } from './upload/form-upload/form-upload.component';
import { ListUploadComponent } from './upload/list-upload/list-upload.component';
import { ModifyUploadComponent } from './upload/modify-upload/modify-upload.component';


registerLocaleData(localeFr, 'fr-FR', localeFrExtra);

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
    ListStageParamComponent,
    MenuComponent,
    DetailsResponseFileComponent,
    ListTeamInfoComponent,
    ModifyTeamInfoComponent,
    ModifyStageParamComponent,
    NewStageParamComponent,
    ConfirmationDialogComponent,
    DetailsTeamComponent,
    CarouselResponseFileComponent,
    SharingParamComponent,
    RankingComponent,
    ListRankingComponent,
    DetailsTeamStageComponent
  ],
  entryComponents: [
    ModifyUploadComponent,
    ModifyResponseFileParamComponent,
    ModifyTeamInfoComponent,
    NewStageParamComponent,
    ConfirmationDialogComponent,
    CarouselResponseFileComponent,
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
  providers: [
    {
      provide: LOCALE_ID,
      useFactory: (localeService: LocaleService) => {
        console.log('locale ID', localeService.getLanguage());
        return localeService.getLanguage();
      },
      deps: [LocaleService]
    },
    AppConfigService,
    { provide: APP_INITIALIZER, useFactory: initializeApp, deps: [AppConfigService], multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

export function initializeApp(appConfigService: AppConfigService) {
  return (): Promise<any> => {
    return appConfigService.load();
  };
}
