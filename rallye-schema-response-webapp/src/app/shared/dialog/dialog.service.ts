import { ComponentType } from '@angular/cdk/portal';
import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

export type DialogSize = 'sm' | 'lg' | 'xl' | string;

export interface DialogOpenOptions<D = any> {
  size?: DialogSize;
  autoFocus?: boolean;
  restoreFocus?: boolean;
  panelClass?: string | string[];
  data?: D;
}

export class AppDialogRef<T, R = unknown> {
  componentInstance: T;
  result: Promise<R>;

  constructor(private matDialogRef: MatDialogRef<T, R>, resultPromise: Promise<R>) {
    this.componentInstance = matDialogRef.componentInstance;
    this.result = resultPromise;
  }

  close(result?: R) {
    this.matDialogRef.close(result);
  }

  dismiss(reason?: R) {
    this.matDialogRef.close(reason);
  }
}

@Injectable({
  providedIn: 'root'
})
export class DialogService {

  constructor(private dialog: MatDialog) { }

  open<T, D = any, R = unknown>(component: ComponentType<T>, options?: DialogOpenOptions<D>): AppDialogRef<T, R> {
    const matDialogRef = this.dialog.open<T, D, R>(component, {
      width: this.getWidth(options?.size),
      autoFocus: options?.autoFocus ?? true,
      restoreFocus: options?.restoreFocus ?? true,
      panelClass: options?.panelClass,
      data: (options?.data ?? null) as D
    });

    const resultPromise = new Promise<R>((resolve, reject) => {
      matDialogRef.afterClosed().subscribe(resolve, reject);
    });

    return new AppDialogRef(matDialogRef, resultPromise);
  }

  hasOpenDialogs(): boolean {
    return this.dialog.openDialogs.length > 0;
  }

  private getWidth(size?: DialogSize): string | undefined {
    switch (size) {
      case 'sm':
        return '420px';
      case 'lg':
        return '800px';
      case 'xl':
        return '1140px';
      default:
        return size || '900px';
    }
  }
}
