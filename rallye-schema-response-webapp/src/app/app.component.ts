import { Component } from '@angular/core';
import { ApplicationUpdateService } from './services/application-update.service';
import { RankingUpdateService } from './services/ranking-update.service';
import { TeamInfoUpdateService } from './services/team-info-update.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(applicationUpdates: ApplicationUpdateService, rankingUpdates: RankingUpdateService,
    teamUpdates: TeamInfoUpdateService) {
    applicationUpdates.updates$.subscribe(update => {
      if (update.domain === 'RESULTS' || update.domain === 'TEAMS' || update.domain === 'CONFIGURATION'
        || update.domain === 'DATABASE' || update.domain === 'APPLICATION') {
        rankingUpdates.triggerUpdate();
      }
      if (update.domain === 'DATABASE' || update.domain === 'APPLICATION') {
        teamUpdates.triggerUpdate();
      }
    });
  }
  title = 'Rallye Schéma';
}
