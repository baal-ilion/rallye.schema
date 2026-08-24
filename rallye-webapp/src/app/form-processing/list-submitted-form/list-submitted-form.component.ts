import { Component, ElementRef, HostListener, Input, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { ChallengeService } from 'src/app/challenge/challenge.service';
import { SubmittedFormMetadata } from '../models/submitted-form-metadata';
import { SubmittedFormService } from '../submitted-form.service';

@Component({
  selector: 'app-list-submitted-form',
  templateUrl: './list-submitted-form.component.html',
  styleUrls: ['./list-submitted-form.component.scss']
})
export class ListSubmittedFormComponent implements OnInit {
  @Input() submittedForms: SubmittedFormMetadata[];
  @Input() selectedSubmittedFormId?: string;
  page = 1;
  actionBusy = false;
  actionError = '';

  constructor(
    public dialogRef: MatDialogRef<ListSubmittedFormComponent>,
    private elementRef: ElementRef,
    private challengeService: ChallengeService,
    private uploadService: SubmittedFormService,
    private confirmationDialogService: ConfirmationDialogService) { }

  ngOnInit() {
    console.log(this.elementRef);
  }

  get selectedSubmittedForm(): SubmittedFormMetadata | undefined {
    return this.submittedForms?.find(submittedForm => submittedForm.id === this.selectedSubmittedFormId);
  }

  get candidates(): SubmittedFormMetadata[] {
    return (this.submittedForms ?? []).filter(submittedForm => submittedForm.id !== this.selectedSubmittedFormId);
  }

  get candidate(): SubmittedFormMetadata | undefined {
    return this.candidates[this.page - 1];
  }

  useCandidate(): void {
    const submittedForm = this.candidate;
    if (!submittedForm || this.actionBusy) return;
    this.actionBusy = true;
    this.actionError = '';
    this.challengeService.selectSubmittedForm(submittedForm.challenge, submittedForm.team, submittedForm.id, true)
      .subscribe(() => this.dialogRef.close(submittedForm), error => {
        this.actionBusy = false;
        this.actionError = error?.error?.message || 'Impossible d’utiliser cette feuille.';
      });
  }

  async deleteCandidate(): Promise<void> {
    const submittedForm = this.candidate;
    if (!submittedForm || this.actionBusy) return;
    const confirmed = await this.confirmationDialogService.confirm(
      'Suppression du doublon',
      'Supprimer définitivement cette feuille ? La feuille actuellement utilisée sera conservée.',
      'Oui', 'Non').catch(() => false);
    if (!confirmed) return;
    this.actionBusy = true;
    this.actionError = '';
    this.uploadService.deleteSubmittedForm(submittedForm.id).subscribe(() => {
      this.delete(submittedForm);
      this.actionBusy = false;
    }, error => {
      this.actionBusy = false;
      this.actionError = error?.error?.message || 'Impossible de supprimer cette feuille.';
    });
  }

  delete(submittedForm: SubmittedFormMetadata) {
    const idx = this.submittedForms.findIndex(r => r.id === submittedForm.id);
    if (idx >= 0) {
      this.submittedForms.splice(idx, 1);
    }
    const candidateCount = this.candidates.length;
    if (candidateCount === 0) {
      this.dialogRef.close(submittedForm);
      return;
    }
    this.page = Math.min(this.page, candidateCount);
  }

  check(event: SubmittedFormMetadata) {
    this.dialogRef.close(event);
  }


  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    if (event.key === 'ArrowRight' && this.contains(event)) {
      this.next();
    }
    if (event.key === 'ArrowLeft' && this.contains(event)) {
      this.previous();
    }
  }

  private contains(event: KeyboardEvent): boolean {
    let target = event.target as HTMLElement;
    while (target) {
      if (this.elementRef.nativeElement.contains(target)) {
        return true;
      }
      target = target.parentElement;
    }
    return false;
  }

  next() {
    if (this.page < this.candidates.length) {
      this.page++;
    }
  }

  previous() {
    if (this.page > 1) {
      this.page--;
    }
  }
}
