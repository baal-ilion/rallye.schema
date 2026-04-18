import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { DialogService } from 'src/app/shared/dialog/dialog.service';
import { ResponseFileParam } from '../models/response-file-param';
import { ModifyResponseFileParamComponent } from '../modify-response-file-param/modify-response-file-param.component';
import { ResponseFileParamService } from '../response-file-param.service';

@Component({
  selector: 'app-details-response-file-param',
  templateUrl: './details-response-file-param.component.html',
  styleUrls: ['./details-response-file-param.component.scss']
})
export class DetailsResponseFileParamComponent implements OnInit {
  @Input() paramUrl: string;
  @Input() stageName: string;
  @Output() deleteEvent = new EventEmitter();

  param: ResponseFileParam;
  modelUrl: string;

  constructor(
    private responseFileParamService: ResponseFileParamService,
    private dialogService: DialogService,
    private confirmationDialogService: ConfirmationDialogService
  ) { }

  ngOnInit() {
    this.param = null;
    this.responseFileParamService.getResponseFileParamByResource(this.paramUrl).subscribe((param) => {
      this.param = param;
      this.modelUrl = param._links?.responseFileModel?.href ?? '';
    });
  }

  openModifyResponseFileParam() {
    const modalRef = this.dialogService.open(ModifyResponseFileParamComponent, {
      data: {
        stageName: this.stageName,
        param: this.param
      }
    });
    modalRef.result.then((result) => {
      if (!result) { return; }
      this.responseFileParamService.updateResponseFileParam(result as FormData).subscribe(data => {
        this.param = data;
      }, () => {
        // keep current param on error
      });
    }).catch(() => {
      // dialog dismissed
    });
  }

  deleteResponseFileParam() {
    this.confirmationDialogService.confirm(
      'Suppression d\'une page de formulaire de réponses',
      'Supprimer la page n°' + this.param.page + ' du formulaire de réponses de l\'épreuve ' + this.param.stage + '\u00A0?',
      'Oui', 'Non')
      .then((confirmed) => {
        if (confirmed) {
          this.responseFileParamService.deleteResponseFileParam(this.param.id).subscribe(() => {
            this.deleteEvent.emit({ id: this.param.id });
          });
        }
      })
      .catch(() => {
        // dialog dismissed
      });
  }
}
