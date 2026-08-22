import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { ApplicationUpdateService } from 'src/app/services/application-update.service';
import { sameData } from 'src/app/shared/data-change.utils';
import { DialogService } from 'src/app/shared/dialog/dialog.service';
import { StageGroup } from '../models/stage-group';
import { StageGroupService } from '../../services/stage-group.service';
import { ModifyStageGroupComponent } from '../modify-stage-group/modify-stage-group.component';

@Component({
  selector: 'app-list-stage-group',
  templateUrl: './list-stage-group.component.html'
})
export class ListStageGroupComponent implements OnInit, OnDestroy {

  groups: StageGroup[] = [];

  loading = false;
  error?: string;
  private destroy$ = new Subject<void>();

  constructor(private stageGroupService: StageGroupService, private dialogService: DialogService,
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

  trackGroup(_index: number, group: StageGroup): string {
    return group.id;
  }

  loadGroups(silent = false): void {
    if (!silent) {
      this.loading = true;
      this.error = undefined;
    }
    this.stageGroupService.getAll().subscribe({
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
    const modalRef = this.dialogService.open(ModifyStageGroupComponent, { size: 'sm' });
    modalRef.componentInstance.stageGroup = { name: '' };
    modalRef.result.then(result => {
      const newGroup = result as StageGroup;
      if (!newGroup || !newGroup.name) {
        return;
      }
      this.stageGroupService.create(newGroup).subscribe({
        next: () => this.loadGroups(),
        error: () => {
          this.error = 'Erreur lors de la création du groupe.';
        }
      });
    }).catch(() => {});
  }

  onDelete(group: StageGroup): void {
    if (!group.id) {
      return;
    }
    if (!confirm(`Supprimer le groupe "${group.name}" ?\nLes epreuves associees seront simplement detachees.`)) {
      return;
    }
    this.stageGroupService.delete(group.id).subscribe({
      next: () => this.loadGroups(),
      error: () => {
        this.error = 'Erreur lors de la suppression du groupe.';
      }
    });
  }

  onEdit(group: StageGroup): void {
    const modalRef = this.dialogService.open(ModifyStageGroupComponent, { size: 'sm' });
    modalRef.componentInstance.stageGroup = { ...group };
    modalRef.result.then(result => {
      const updatedGroup = result as StageGroup;
      if (!updatedGroup || !updatedGroup.name) {
        return;
      }
      this.stageGroupService.update(updatedGroup).subscribe({
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
