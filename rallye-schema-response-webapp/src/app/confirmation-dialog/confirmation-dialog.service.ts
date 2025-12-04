import { Injectable } from '@angular/core';
import { DialogService } from '../shared/dialog/dialog.service';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class ConfirmationDialogService {

  constructor(private dialogService: DialogService) { }

  public confirm(
    title: string,
    message: string,
    btnOkText: string = 'OK',
    btnCancelText: string = 'Cancel',
    dialogSize:  'sm' | 'lg' | 'xl' | string = 'sm'): Promise<boolean> {
    const modalRef = this.dialogService.open<ConfirmationDialogComponent, boolean>(ConfirmationDialogComponent, { size: dialogSize });
    modalRef.componentInstance.title = title;
    modalRef.componentInstance.message = message;
    modalRef.componentInstance.btnOkText = btnOkText;
    modalRef.componentInstance.btnCancelText = btnCancelText;

    return modalRef.result as Promise<boolean>;
  }
}
