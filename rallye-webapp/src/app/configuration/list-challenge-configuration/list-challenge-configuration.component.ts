import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { ApplicationUpdateService } from 'src/app/services/application-update.service';
import { sameData } from 'src/app/shared/data-change.utils';
import { HalLink } from '../../models/hal-link';
import { ChallengeConfiguration } from '../models/challenge-configuration';
import { NewChallengeConfigurationComponent } from '../new-challenge-configuration/new-challenge-configuration.component';
import { ChallengeConfigurationService } from '../challenge-configuration.service';
import { DialogService } from 'src/app/shared/dialog/dialog.service';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';

interface ChallengeConfigurationDetail {
  configuration: ChallengeConfiguration;
  questionCount: number;
  performanceCount: number;
  formPageCount: number;
}

interface GroupedChallengeConfigurationDetail {
  groupName: string;
  items: ChallengeConfigurationDetail[];
}

@Component({
  selector: 'app-list-challenge-configuration',
  templateUrl: './list-challenge-configuration.component.html',
  styleUrls: ['./list-challenge-configuration.component.scss']
})
export class ListChallengeConfigurationComponent implements OnInit, OnDestroy {
  challengeConfigurationDetails: ChallengeConfigurationDetail[] = [];
  groupedChallengeConfigurationDetails: GroupedChallengeConfigurationDetail[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private challengeConfigurationService: ChallengeConfigurationService,
    private dialogService: DialogService,
    private confirmationDialogService: ConfirmationDialogService,
    private applicationUpdates: ApplicationUpdateService) { }

  ngOnInit() {
    this.loadChallengeConfigurationDetails();
    this.applicationUpdates.updates$.pipe(
      filter(update => update.domain === 'CONFIGURATION' || update.domain === 'DATABASE' || update.domain === 'RESYNC'),
      takeUntil(this.destroy$)
    ).subscribe(() => this.loadChallengeConfigurationDetails());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadChallengeConfigurationDetails() {
    try {
      const nextDetails: ChallengeConfigurationDetail[] = [];
      const challengeConfigurations = await this.challengeConfigurationService.getChallengeConfigurations().toPromise();
      for (const challengeConfiguration of challengeConfigurations?._embedded?.challengeConfigurations ?? []) {
        const challengeConfigurationDetail: ChallengeConfigurationDetail = {
          configuration: challengeConfiguration,
          performanceCount: 0,
          questionCount: 0,
          formPageCount: (challengeConfiguration._links?.formRecognitionConfigurations as HalLink[])?.length ?? 0
        };
        for (const questionDefinition of Object.values(challengeConfiguration.questionDefinitions)) {
          if (questionDefinition.type === 'QUESTION') {
            challengeConfigurationDetail.questionCount += 1;
          } else if (questionDefinition.type === 'PERFORMANCE') {
            challengeConfigurationDetail.performanceCount += 1;
          }
        }
        nextDetails.push(challengeConfigurationDetail);
      }

      if (!sameData(this.challengeConfigurationDetails, nextDetails)) {
        this.challengeConfigurationDetails = nextDetails;
        this.buildGroupedChallengeConfigurationDetails();
      }

    } catch (error) {
      console.log(error);
    }
  }

  private buildGroupedChallengeConfigurationDetails(): void {
    const groupsMap = new Map<string, ChallengeConfigurationDetail[]>();

    this.challengeConfigurationDetails.forEach(detail => {
      const configuration: any = detail.configuration as any;

      // On essaie d'abord configuration.group.name, sinon groupName, sinon "Sans groupe"
      const name =
        (configuration.group && configuration.group.name)
          ? configuration.group.name
          : (configuration.groupName ? configuration.groupName : 'Sans groupe');

      if (!groupsMap.has(name)) {
        groupsMap.set(name, []);
      }
      groupsMap.get(name)!.push(detail);
    });

    this.groupedChallengeConfigurationDetails = Array.from(groupsMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'fr', { sensitivity: 'base' }))
      .map(([groupName, items]) => ({
        groupName,
        items: items.sort((a, b) => a.configuration.challenge - b.configuration.challenge)
      }));
  }

  async addChallengeConfiguration() {
    const modalRef = this.dialogService.open<NewChallengeConfigurationComponent>(NewChallengeConfigurationComponent);
    try {
      const result = await modalRef.result as ChallengeConfiguration;
      console.log(result);
      if (!result) { return; }
      try {
        await this.challengeConfigurationService.addChallengeConfiguration(result).toPromise();
        this.loadChallengeConfigurationDetails();
      } catch (error) {
        console.log(error);
        this.loadChallengeConfigurationDetails();
      }
    } catch (error) {
      console.log(error);
    }
  }

  trackGroup(_index: number, group: GroupedChallengeConfigurationDetail): string {
    return group.groupName;
  }

  trackChallengeDetail(_index: number, detail: ChallengeConfigurationDetail): string | number {
    return detail.configuration.id ?? detail.configuration.challenge;
  }

  async deleteChallengeConfiguration(challengeConfiguration: ChallengeConfiguration): Promise<void> {
    if (!challengeConfiguration.id) {
      return;
    }
    try {
      const confirmed = await this.confirmationDialogService.confirm(
        'Suppression de l\'épreuve ' + challengeConfiguration.name,
        'Cette opération est irréversible.\nVoulez-vous supprimer l\'épreuve ' + challengeConfiguration.challenge + ' - ' + challengeConfiguration.name + ' ?',
        'Oui', 'Non');
      if (confirmed) {
        await this.challengeConfigurationService.deleteChallengeConfiguration(challengeConfiguration.id).toPromise();
      }
      await this.loadChallengeConfigurationDetails();
    } catch (error) {
      console.log(error);
      await this.loadChallengeConfigurationDetails();
    }
  }
}
