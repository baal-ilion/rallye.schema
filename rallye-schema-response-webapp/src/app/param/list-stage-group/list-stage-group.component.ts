import { Component, OnInit } from '@angular/core';
import { DialogService } from 'src/app/shared/dialog/dialog.service';
import { StageGroup } from '../models/stage-group';
import { StageGroupService } from '../../services/stage-group.service';
import { ModifyStageGroupComponent } from '../modify-stage-group/modify-stage-group.component';

@Component({
  selector: 'app-list-stage-group',
  templateUrl: './list-stage-group.component.html'
})
export class ListStageGroupComponent implements OnInit {

  groups: StageGroup[] = [];

  loading = false;
  error?: string;

  constructor(private stageGroupService: StageGroupService, private dialogService: DialogService) {}

  ngOnInit(): void {
    this.loadGroups();
  }

  loadGroups(): void {
    this.loading = true;
    this.error = undefined;
    this.stageGroupService.getAll().subscribe({
      next: groups => {
        this.groups = groups;
        this.loading = false;
      },
      error: () => {
        this.error = 'Erreur lors du chargement des groupes.';
        this.loading = false;
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
