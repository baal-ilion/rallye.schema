import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss']
})
export class PaginationComponent {
  @Input() collectionSize = 0;
  @Input() pageSize = 1;
  @Input() boundaryLinks = false;
  @Input() page = 1;
  @Input() disabled = false;

  @Output() pageChange = new EventEmitter<number>();

  get totalPages(): number {
    const size = this.pageSize > 0 ? this.pageSize : 1;
    const pages = Math.ceil(this.collectionSize / size);
    return pages > 0 ? pages : 1;
  }

  get canPrev(): boolean {
    return !this.disabled && this.page > 1;
  }

  get canNext(): boolean {
    return !this.disabled && this.page < this.totalPages;
  }

  previous() {
    this.goTo(this.page - 1);
  }

  next() {
    this.goTo(this.page + 1);
  }

  goTo(page: number) {
    if (this.disabled) {
      return;
    }
    const target = Math.min(Math.max(page, 1), this.totalPages);
    if (target !== this.page) {
      this.page = target;
      this.pageChange.emit(this.page);
    }
  }

  canGoFirst(): boolean {
    return this.boundaryLinks && !this.disabled && this.page > 1;
  }

  canGoLast(): boolean {
    return this.boundaryLinks && !this.disabled && this.page < this.totalPages;
  }
}
