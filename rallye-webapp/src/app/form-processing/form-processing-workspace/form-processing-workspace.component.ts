import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import { SubmittedFormQueueUpdateService } from 'src/app/services/submitted-form-queue-update.service';
import { ApplicationUpdateService } from 'src/app/services/application-update.service';
import { DialogService } from 'src/app/shared/dialog/dialog.service';
import { SubmittedFormMetadata } from '../models/submitted-form-metadata';
import { SubmittedFormSummary } from '../models/submitted-form-summary';
import { SubmittedFormService } from '../submitted-form.service';

type QueueFilter = 'ALL' | 'PROCESSING' | 'QUEUED' | 'ATTENTION' | 'ERROR';

@Component({
  selector: 'app-form-processing-workspace',
  templateUrl: './form-processing-workspace.component.html',
  styleUrls: ['./form-processing-workspace.component.scss']
})
export class FormProcessingWorkspaceComponent implements OnInit, OnDestroy {
  summaries: SubmittedFormSummary[] = [];
  submittedFormsMetadata: SubmittedFormMetadata[] = [];
  selectedSummary?: SubmittedFormSummary;
  filter: QueueFilter = 'ALL';
  loading = true;
  queueTotal = 0;

  private leasedId?: string;
  private leaseHeartbeat?: ReturnType<typeof setInterval>;
  private refreshing = false;
  private destroyed = false;
  private queueEvents = new Subject<void>();
  private queueSubscriptions = new Subscription();
  private refreshPending = false;

  constructor(private uploadService: SubmittedFormService, private dialogService: DialogService,
    private queueUpdates: SubmittedFormQueueUpdateService,
    private applicationUpdates: ApplicationUpdateService) { }

  ngOnInit() {
    this.refreshQueue(true);
    this.queueSubscriptions.add(this.queueUpdates.updates$.subscribe(() => this.queueEvents.next()));
    this.queueSubscriptions.add(this.applicationUpdates.updates$.pipe(
      filter(update => update.domain === 'DATABASE' || update.domain === 'RESYNC')
    ).subscribe(() => this.queueEvents.next()));
    this.queueSubscriptions.add(this.queueEvents.pipe(debounceTime(100)).subscribe(() => this.refreshQueue(false)));
    this.leaseHeartbeat = setInterval(() => this.renewCurrentLease(), 30000);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.releaseCurrentLease();
    this.queueSubscriptions.unsubscribe();
    this.queueEvents.complete();
    if (this.leaseHeartbeat) clearInterval(this.leaseHeartbeat);
  }

  get displayedSummaries(): SubmittedFormSummary[] {
    switch (this.filter) {
      case 'PROCESSING': return this.summaries.filter(item => item.processingStatus === 'PROCESSING');
      case 'QUEUED': return this.summaries.filter(item => item.processingStatus === 'QUEUED');
      case 'ATTENTION': return this.summaries.filter(item => this.isReady(item) && !!item.manualReviewRequired);
      case 'ERROR': return this.summaries.filter(item => item.processingStatus === 'ERROR');
      default: return this.summaries;
    }
  }

  count(filter: QueueFilter): number {
    if (filter === 'ALL') return this.summaries.length;
    if (filter === 'ATTENTION') return this.summaries.filter(item => this.isReady(item) && !!item.manualReviewRequired).length;
    return this.summaries.filter(item => item.processingStatus === filter).length;
  }

  setFilter(filter: QueueFilter) {
    this.filter = filter;
    if (!this.selectedSummary || !this.displayedSummaries.some(item => item.id === this.selectedSummary?.id)) {
      const candidate = this.displayedSummaries.find(item => this.isReady(item) && item.availableForVerification);
      if (candidate) this.select(candidate);
    }
  }

  async select(summary: SubmittedFormSummary) {
    this.selectedSummary = summary;
    if (!this.isReady(summary) || !summary.availableForVerification) {
      this.releaseCurrentLease();
      this.submittedFormsMetadata = [];
      return;
    }
    if (this.leasedId === summary.id && this.submittedFormsMetadata.length) return;
    this.releaseCurrentLease();
    this.submittedFormsMetadata = [];
    try {
      const claimed = await this.uploadService.claimForVerification(summary.id).toPromise();
      if (claimed) {
        this.leasedId = claimed.id;
        this.submittedFormsMetadata = [claimed];
      }
    } catch (error) {
      console.warn('Formulaire réservé par un autre appareil.', error);
      await this.refreshQueue(false);
    }
  }

  async refreshQueue(selectFirst: boolean) {
    if (this.refreshing) {
      this.refreshPending = true;
      return;
    }
    this.refreshing = true;
    try {
      const page = await this.uploadService.getProcessingQueue(0, 500).toPromise();
      this.summaries = this.reconcileSummaries(page?.content ?? []);
      this.queueTotal = page?.totalElements ?? 0;
      if (this.selectedSummary) {
        this.selectedSummary = this.summaries.find(item => item.id === this.selectedSummary?.id);
      }
      if ((selectFirst || !this.selectedSummary) && !this.leasedId) {
        const candidate = this.displayedSummaries.find(item => this.isReady(item) && item.availableForVerification)
          ?? this.summaries.find(item => this.isReady(item) && item.availableForVerification);
        if (candidate) await this.select(candidate);
      }
    } catch (error) {
      console.error('Impossible de rafraîchir la file des formulaires.', error);
    } finally {
      this.loading = false;
      this.refreshing = false;
      if (this.refreshPending && !this.destroyed) {
        this.refreshPending = false;
        this.queueEvents.next();
      }
    }
  }

  trackSummary(_: number, summary: SubmittedFormSummary): string {
    return summary.id;
  }

  deletePage(_: number) {
    const previousId = this.selectedSummary?.id;
    this.releaseCurrentLease();
    this.submittedFormsMetadata = [];
    this.selectedSummary = undefined;
    this.summaries = this.summaries.filter(item => item.id !== previousId);
    this.refreshQueue(true);
  }

  retry(summary: SubmittedFormSummary, event: Event) {
    event.stopPropagation();
    this.uploadService.retryProcessing(summary.id).subscribe({
      next: () => this.refreshQueue(false),
      error: error => console.error('Impossible de relancer le traitement.', error)
    });
  }

  isReady(summary: SubmittedFormSummary): boolean {
    return !summary.processingStatus
      || summary.processingStatus.startsWith('READY')
      || summary.processingStatus === 'MANUAL_REVIEW_REQUIRED';
  }

  statusLabel(summary: SubmittedFormSummary): string {
    if (!summary.availableForVerification && this.isReady(summary)) return 'Vérifié ailleurs';
    if (summary.processingStatus === 'QUEUED') return 'En attente';
    if (summary.processingStatus === 'PROCESSING') return 'Analyse en cours';
    if (summary.processingStatus === 'ERROR') return 'Échec';
    if (summary.manualReviewRequired) return 'Attention requise';
    return 'Prêt à vérifier';
  }

  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    if (this.dialogService.hasOpenDialogs()) return;
    if (event.key === 'ArrowRight') this.navigate(1);
    if (event.key === 'ArrowLeft') this.navigate(-1);
  }

  private navigate(offset: number) {
    const candidates = this.displayedSummaries.filter(item => this.isReady(item) && item.availableForVerification);
    if (!candidates.length) return;
    const current = candidates.findIndex(item => item.id === this.selectedSummary?.id);
    const next = Math.min(candidates.length - 1, Math.max(0, current + offset));
    this.select(candidates[next]);
  }

  private renewCurrentLease() {
    if (!this.leasedId) return;
    this.uploadService.renewVerificationLease(this.leasedId).subscribe({
      error: error => {
        console.warn('La réservation du formulaire a expiré.', error);
        this.leasedId = undefined;
        this.submittedFormsMetadata = [];
        this.refreshQueue(true);
      }
    });
  }

  private reconcileSummaries(incoming: SubmittedFormSummary[]): SubmittedFormSummary[] {
    const currentById = new Map(this.summaries.map(summary => [summary.id, summary]));
    return incoming.map(summary => {
      const current = currentById.get(summary.id);
      if (!current) return summary;
      Object.assign(current, summary);
      return current;
    });
  }

  private releaseCurrentLease() {
    const id = this.leasedId;
    this.leasedId = undefined;
    if (id) this.uploadService.releaseVerificationLease(id).subscribe({ error: () => undefined });
  }
}
