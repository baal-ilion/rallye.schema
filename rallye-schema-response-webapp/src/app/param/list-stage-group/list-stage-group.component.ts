import { Component, OnInit } from '@angular/core';
import { StageGroup } from '../models/stage-group';
import { StageGroupService } from '../../services/stage-group.service';

@Component({
  selector: 'app-list-stage-group',
  templateUrl: './list-stage-group.component.html'
})
export class ListStageGroupComponent implements OnInit {

  groups: StageGroup[] = [];
  newGroup: StageGroup = { name: '', description: '' };

  loading = false;
  error?: string;

  constructor(private stageGroupService: StageGroupService) {}

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
    if (!this.newGroup.name || this.newGroup.name.trim().length === 0) {
      return;
    }
    this.stageGroupService.create(this.newGroup).subscribe({
      next: () => {
        this.newGroup = { name: '', description: '' };
        this.loadGroups();
      },
      error: () => {
        this.error = 'Erreur lors de la création du groupe.';
      }
    });
  }

  onDelete(group: StageGroup): void {
    if (!group.id) {
      return;
    }
    if (!confirm(`Supprimer le groupe "${group.name}" ?\nLes épreuves associées seront simplement détachées.`)) {
      return;
    }
    this.stageGroupService.delete(group.id).subscribe({
      next: () => this.loadGroups(),
      error: () => {
        this.error = 'Erreur lors de la suppression du groupe.';
      }
    });
  }
}
