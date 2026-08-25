import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { HalCollection } from 'src/app/models/hal-collection';
import { HalLink } from 'src/app/models/hal-link';
import { AppDialogRef, DialogService } from 'src/app/shared/dialog/dialog.service';
import { isSubmittedFormSource } from 'src/app/challenge/models/submitted-form-source';
import { ChallengeResult } from 'src/app/challenge/models/challenge-result';
import { ChallengeService } from 'src/app/challenge/challenge.service';
import { ListSubmittedFormComponent } from '../list-submitted-form/list-submitted-form.component';
import { SubmittedFormMetadata } from '../models/submitted-form-metadata';
import { SubmittedFormService } from '../submitted-form.service';

@Component({
  selector: 'app-submitted-form-actions',
  templateUrl: './submitted-form-actions.component.html',
  styleUrls: ['./submitted-form-actions.component.scss']
})
export class SubmittedFormActionsComponent implements OnInit, OnChanges {

  @Input() submittedFormMetadata: SubmittedFormMetadata;
  @Input() context: 'verification' | 'validation' = 'verification';
  @Output() deleteEvent = new EventEmitter<string>();
  @Output() checkedEvent = new EventEmitter<SubmittedFormMetadata>();

  isSelected = false;
  selecteds: SubmittedFormMetadata[] = [];
  sameFiles: SubmittedFormMetadata[] = [];
  actionError = '';
  loading = true;

  constructor(
    private uploadService: SubmittedFormService,
    private challengeService: ChallengeService,
    private dialogService: DialogService,
    private confirmationDialogService: ConfirmationDialogService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes.submittedFormMetadata.isFirstChange()) {
      this.initialize();
    }
  }

  ngOnInit(): void {
    this.initialize().then(() => { }).catch(err => console.error(err));
  }

  private clear(): void {
    this.isSelected = false;
    this.selecteds = [];
    this.sameFiles = [];
  }

  private async initialize() {
    console.log('initialize');
    this.loading = true;
    this.clear();
    const samePromise = this.loadSame(this.submittedFormMetadata?._links?.same as HalLink);
    const challengePromise = this.challengeService.findChallenge(this.submittedFormMetadata?.challenge, this.submittedFormMetadata?.team).toPromise();
    let challengeResult: ChallengeResult;
    try {
      challengeResult = await challengePromise;
    } catch (error) {
      console.log(error);
    }
    const selectedSubmittedFormIds = challengeResult?.responseSources?.filter(isSubmittedFormSource).map(s => s.id) ?? [];
    this.isSelected = selectedSubmittedFormIds.includes(this.submittedFormMetadata?.id);
    let same: SubmittedFormMetadata[] = [];
    try {
      same = (await samePromise) ?? [];
    } catch (error) {
      console.log(error);
    }
    this.sameFiles = this.submittedFormMetadata ? [this.submittedFormMetadata, ...same] : same;
    this.selecteds = same.filter(f => selectedSubmittedFormIds.includes(f.id));
    this.loading = false;
  }

  private async loadSame(same: HalLink): Promise<SubmittedFormMetadata[]> {
    if (same?.href) {
      try {
        const sames = await this.uploadService.getResource<HalCollection<SubmittedFormMetadata>>(same.href)
          .toPromise();
        return sames?._embedded?.submittedFormMetadataes ?? [];
      } catch (error) {
        console.log(error);
      }
    }
    return [];
  }

  check() {
	this.actionError = '';
    this.challengeService.selectSubmittedForm(
      this.submittedFormMetadata.challenge,
      this.submittedFormMetadata.team,
      this.submittedFormMetadata.id,
      false
    ).subscribe(() => {
      // Marquer la feuille comme acceptée côté UI
      this.submittedFormMetadata.checked = true;
      this.checkedEvent.emit(this.submittedFormMetadata);
      this.ngOnInit();
    }, err => {
	  this.showActionError(err);
      this.ngOnInit();
    });
  }

  uncheck() {
    this.actionError = '';
    this.confirmationDialogService.confirm(
      'Renvoyer la feuille vers le traitement',
      'Renvoyer cette feuille vers le traitement des formulaires ? Les corrections manuelles O/N/Y de cette page seront réinitialisées et l’épreuve sera dévalidée.',
      'Oui', 'Non')
      .then(confirmed => {
        if (!confirmed) return;
        this.challengeService.releaseSubmittedForm(
          this.submittedFormMetadata.challenge,
          this.submittedFormMetadata.team,
          this.submittedFormMetadata.id
        ).subscribe(() => {
          this.submittedFormMetadata.checked = false;
          this.checkedEvent.emit(this.submittedFormMetadata);
        }, err => this.showActionError(err));
      }).catch(() => undefined);
  }

  delete() {
	this.actionError = '';
    this.confirmationDialogService.confirm(
      'Suppression de la feuille de réponses',
      this.context === 'validation'
        ? 'Supprimer définitivement cette feuille ? L’épreuve sera dévalidée et les corrections manuelles O/N/Y de cette page seront réinitialisées.'
        : 'Supprimer définitivement cette feuille de réponses ?',
      'Oui', 'Non')
      .then((confirmed) => {
        console.log('User confirmed:', confirmed);
        if (confirmed) {
          const deletion = this.context === 'validation'
            ? this.challengeService.deleteSelectedSubmittedForm(
                this.submittedFormMetadata.challenge, this.submittedFormMetadata.team, this.submittedFormMetadata.id)
            : this.uploadService.deleteSubmittedForm(this.submittedFormMetadata.id);
          deletion.subscribe(() => {
            console.log('Deleted:', this.submittedFormMetadata.id);
            this.deleteEvent.emit(this.submittedFormMetadata.id);
          }, err => {
            this.showActionError(err);
          });
        }
      })
      .catch(() => {
        console.log('User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)');
      });
  }

  openDuplicateComparison() {
    if (this.sameFiles.length < 2) return;
    const modalRef: AppDialogRef<ListSubmittedFormComponent> = this.dialogService.open(ListSubmittedFormComponent, { size: 'xl' });
    modalRef.componentInstance.submittedForms = this.sameFiles;
    modalRef.componentInstance.selectedSubmittedFormId = this.isSelected
      ? this.submittedFormMetadata.id
      : this.selecteds[0]?.id;
    modalRef.result.then((result) => {
      if (result) {
        this.checkedEvent.emit(result as SubmittedFormMetadata);
        this.ngOnInit();
      }
    }).catch(() => undefined);
  }

  private showActionError(error: any) {
	this.actionError = error?.error?.message
	  || 'Impossible d’accepter le formulaire. Vérifiez que l’équipe, l’épreuve et la page existent.';
	console.error(this.actionError, error);
  }
}
