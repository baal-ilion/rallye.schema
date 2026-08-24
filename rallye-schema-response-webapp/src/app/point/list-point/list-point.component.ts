import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx';
import { merge, of, Subject } from 'rxjs';
import { auditTime, catchError, finalize, startWith, switchMap, takeUntil, tap } from 'rxjs/operators';
import { PointService } from '../point.service';
import { RankingUpdateService } from '../../services/ranking-update.service';
import { sameData } from '../../shared/data-change.utils';

@Component({
  selector: 'app-list-point',
  templateUrl: './list-point.component.html',
  styleUrls: ['./list-point.component.scss']
})
export class ListPointComponent implements OnInit, OnDestroy {
  points: any[] = [];
  loading = false;
  error: string | null = null;
  readonly stageOrder = (a: { key: string }, b: { key: string }) => Number(a.key) - Number(b.key);

  private refresh$ = new Subject<'recompute' | 'auto'>();
  private destroy$ = new Subject<void>();

  constructor(
    private pointService: PointService,
    private rankingUpdateService: RankingUpdateService
  ) { }

  ngOnInit() {
    merge(this.refresh$, this.rankingUpdateService.updates$)
      .pipe(
        startWith('__initial__' as const),
        auditTime(150),
        switchMap((trigger) => {
          const isInitial = trigger === '__initial__';
          const isManualRecompute = trigger === 'recompute';

          if (isInitial || isManualRecompute) {
            this.loading = true;
            this.error = null;
          }

          const loader$ = isManualRecompute
            ? this.pointService.recomputePoints()
            : this.pointService.getPoints();

          return loader$.pipe(
            tap((points) => {
              const sorted = (points || []).sort((a: any, b: any) => (a.team || 0) - (b.team || 0));
              if (!sameData(this.points, sorted)) {
                this.points = sorted;
              }
              this.error = null;
            }),
            catchError(err => {
              console.error(err);
              this.error = 'Erreur lors du chargement des points.';
              return of([]);
            }),
            finalize(() => {
              if (isInitial || isManualRecompute) {
                this.loading = false;
              }
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  recomputePoints() {
    this.refresh$.next('recompute');
  }

  downloadPoints(): void {
    const rows: any[] = [];
    this.points.forEach(point => {
      Object.values(point.stagePoints || {})
        .sort((left: any, right: any) => Number(left.stage) - Number(right.stage))
        .forEach((stagePoint: any) => {
          const questions = stagePoint.questions || [];
          if (!questions.length) {
            rows.push({
              'Équipe': point.team,
              'Épreuve': stagePoint.stage,
              'Question': '',
              'Points de la question': '',
              'Total de l’épreuve': stagePoint.total,
              'Total de l’équipe': point.total
            });
            return;
          }
          questions.forEach((question: any) => rows.push({
            'Équipe': point.team,
            'Épreuve': stagePoint.stage,
            'Question': question.name,
            'Points de la question': question.total,
            'Total de l’épreuve': stagePoint.total,
            'Total de l’équipe': point.total
          }));
        });
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Détail des points');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });
    const timestamp = new DatePipe('fr-FR').transform(Date.now(), 'yyyyMMddHHmmss');
    FileSaver.saveAs(data, `rallyeschema-points-${timestamp}.xlsx`);
  }
}
