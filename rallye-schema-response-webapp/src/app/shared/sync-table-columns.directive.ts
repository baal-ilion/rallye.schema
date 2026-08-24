import { AfterViewInit, Directive, ElementRef, Injectable, Input, NgZone, OnDestroy } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TableColumnSyncRegistry {
  private readonly groups = new Map<string, Set<HTMLTableElement>>();
  private readonly scheduledFrames = new Map<string, number>();

  register(group: string, table: HTMLTableElement): void {
    if (!this.groups.has(group)) {
      this.groups.set(group, new Set());
    }
    this.groups.get(group)!.add(table);
    this.schedule(group);
  }

  unregister(group: string, table: HTMLTableElement): void {
    const tables = this.groups.get(group);
    tables?.delete(table);
    if (!tables?.size) {
      this.groups.delete(group);
    } else {
      this.schedule(group);
    }
  }

  schedule(group: string): void {
    const pending = this.scheduledFrames.get(group);
    if (pending !== undefined) {
      cancelAnimationFrame(pending);
    }
    this.scheduledFrames.set(group, requestAnimationFrame(() => {
      this.scheduledFrames.delete(group);
      this.synchronize(group);
    }));
  }

  private synchronize(group: string): void {
    const tables = Array.from(this.groups.get(group) ?? []).filter(table => table.isConnected);
    if (!tables.length) {
      return;
    }

    tables.forEach(table => {
      table.querySelector('colgroup[data-column-sync]')?.remove();
      table.style.removeProperty('table-layout');
      table.style.removeProperty('width');
      table.closest<HTMLElement>('.data-table-fit')?.style.removeProperty('width');
    });

    // Sur smartphone, les largeurs fixes calculées sur le contenu feraient
    // déborder les tableaux. Le CSS responsive répartit alors les colonnes
    // dans la largeur disponible et autorise les retours à la ligne.
    if (window.matchMedia('(max-width: 767.98px)').matches) {
      return;
    }

    requestAnimationFrame(() => {
      const columnCount = Math.max(...tables.map(table =>
        Array.from(table.rows[0]?.cells ?? []).reduce((count, cell) => count + cell.colSpan, 0)));
      const widths = Array.from({ length: columnCount }, () => 0);

      tables.forEach(table => {
        Array.from(table.rows).forEach(row => {
          let columnIndex = 0;
          Array.from(row.cells).forEach(cell => {
            widths[columnIndex] = Math.max(widths[columnIndex], Math.ceil(cell.scrollWidth));
            columnIndex += cell.colSpan;
          });
        });
      });

      tables.forEach(table => {
        const localColumnCount = Array.from(table.rows[0]?.cells ?? [])
          .reduce((count, cell) => count + cell.colSpan, 0);
        const colgroup = document.createElement('colgroup');
        colgroup.dataset.columnSync = group;
        let tableWidth = 0;
        for (let index = 0; index < localColumnCount; index++) {
          const col = document.createElement('col');
          col.style.width = `${widths[index]}px`;
          colgroup.appendChild(col);
          tableWidth += widths[index];
        }
        table.insertBefore(colgroup, table.firstChild);
        table.style.setProperty('table-layout', 'fixed', 'important');
        table.style.setProperty('width', `${tableWidth}px`, 'important');
        const container = table.closest<HTMLElement>('.data-table-fit');
        if (container) {
          container.style.setProperty('width', `${tableWidth}px`, 'important');
        }
      });
    });
  }
}

@Directive({ selector: 'table[appSyncTableColumns]' })
export class SyncTableColumnsDirective implements AfterViewInit, OnDestroy {
  @Input() appSyncTableColumns: string | null = 'default';

  private observer?: MutationObserver;
  private registeredGroup?: string;
  private readonly resizeListener = () => {
    if (this.registeredGroup) {
      this.registry.schedule(this.registeredGroup);
    }
  };

  constructor(
    private readonly elementRef: ElementRef<HTMLTableElement>,
    private readonly registry: TableColumnSyncRegistry,
    private readonly zone: NgZone
  ) {}

  ngAfterViewInit(): void {
    if (!this.appSyncTableColumns) {
      return;
    }
    this.registeredGroup = this.appSyncTableColumns;
    this.zone.runOutsideAngular(() => {
      this.registry.register(this.registeredGroup!, this.elementRef.nativeElement);
      this.observer = new MutationObserver(() => this.registry.schedule(this.registeredGroup!));
      this.observer.observe(this.elementRef.nativeElement.tBodies[0] ?? this.elementRef.nativeElement, {
        childList: true,
        subtree: true,
        characterData: true
      });
      window.addEventListener('resize', this.resizeListener);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    window.removeEventListener('resize', this.resizeListener);
    if (this.registeredGroup) {
      this.registry.unregister(this.registeredGroup, this.elementRef.nativeElement);
    }
  }
}
