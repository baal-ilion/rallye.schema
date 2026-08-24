import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { ApplicationUpdateService } from 'src/app/services/application-update.service';
import { sameData } from 'src/app/shared/data-change.utils';
import { DialogService } from 'src/app/shared/dialog/dialog.service';
import { ChallengeGroup } from '../models/challenge-group';
import { ChallengeGroupService } from '../../services/challenge-group.service';
import { ModifyChallengeGroupComponent } from '../modify-challenge-group/modify-challenge-group.component';

@Component({
  selector: 'app-list-challenge-group',
  templateUrl: './list-challenge-group.component.html'
})
export class ListChallengeGroupComponent implements OnInit, OnDestroy {

  groups: ChallengeGroup[] = [];

  loading = false;
  error?: string;
  private destroy$ = new Subject<void>();

  constructor(private challengeGroupService: ChallengeGroupService, private dialogService: DialogService,
    private applicationUpdates: ApplicationUpdateService) {}

  ngOnInit(): void {
    this.loadGroups();
    this.applicationUpdates.updates$.pipe(
      filter(update => update.domain === 'CONFIGURATION' || update.domain === 'DATABASE' || update.domain === 'RESYNC'),
      takeUntil(this.destroy$)
    ).subscribe(() => this.loadGroups(true));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackGroup(_index: number, group: ChallengeGroup): string {
    return group.id;
  }

  loadGroups(silent = false): void {
    if (!silent) {
      this.loading = true;
      this.error = undefined;
    }
    this.challengeGroupService.getAll().subscribe({
      next: groups => {
        if (!sameData(this.groups, groups)) {
          this.groups = groups;
        }
        if (!silent) {
          this.loading = false;
        }
      },
      error: () => {
        if (!silent) {
          this.error = 'Erreur lors du chargement des groupes.';
          this.loading = false;
        }
      }
    });
  }

  onCreate(): void {
    const modalRef = this.dialogService.open(ModifyChallengeGroupComponent, { size: 'sm' });
    modalRef.componentInstance.challengeGroup = { name: '' };
    modalRef.result.then(result => {
      const newGroup = result as ChallengeGroup;
      if (!newGroup || !newGroup.name) {
        return;
      }
      this.challengeGroupService.create(newGroup).subscribe({
        next: () => this.loadGroups(),
        error: () => {
          this.error = 'Erreur lors de la création du groupe.';
        }
      });
    }).catch(() => {});
  }

  onDelete(group: ChallengeGroup): void {
    if (!group.id) {
      return;
    }
    if (!confirm(`Supprimer le groupe "${group.name}" ?\nLes challenges associees seront simplement detachees.`)) {
      return;
    }
    this.challengeGroupService.delete(group.id).subscribe({
      next: () => this.loadGroups(),
      error: () => {
        this.error = 'Erreur lors de la suppression du groupe.';
      }
    });
  }

  onEdit(group: ChallengeGroup): void {
    const modalRef = this.dialogService.open(ModifyChallengeGroupComponent, { size: 'sm' });
    modalRef.componentInstance.challengeGroup = { ...group };
    modalRef.result.then(result => {
      const updatedGroup = result as ChallengeGroup;
      if (!updatedGroup || !updatedGroup.name) {
        return;
      }
      this.challengeGroupService.update(updatedGroup).subscribe({
        next: updated => {
          const idx = this.groups.findIndex(g => g.id === updated.id);
          if (idx !== -1) {
            this.groups[idx] = updated;
          }
        },
        error: () => {
          this.error = 'Erreur lors de la mise à jour du groupe.';
        }
      });
    }).catch(() => {});
  }
}
