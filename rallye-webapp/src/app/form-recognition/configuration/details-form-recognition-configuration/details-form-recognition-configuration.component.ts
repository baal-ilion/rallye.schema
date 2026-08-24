import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';
import { DialogService } from 'src/app/shared/dialog/dialog.service';
import { FormRecognitionConfiguration } from '../models/form-recognition-configuration';
import { ModifyFormRecognitionConfigurationComponent } from '../modify-form-recognition-configuration/modify-form-recognition-configuration.component';
import { FormRecognitionConfigurationService } from '../form-recognition-configuration.service';

@Component({
  selector: 'app-details-form-recognition-configuration',
  templateUrl: './details-form-recognition-configuration.component.html',
  styleUrls: ['./details-form-recognition-configuration.component.scss']
})
export class DetailsFormRecognitionConfigurationComponent implements OnInit {
  @Input() configurationUrl: string;
  @Input() challengeName: string;
  @Output() deleteEvent = new EventEmitter();

  configuration: FormRecognitionConfiguration;
  modelUrl: string;

  constructor(
    private formRecognitionConfigurationService: FormRecognitionConfigurationService,
    private dialogService: DialogService,
    private confirmationDialogService: ConfirmationDialogService
  ) { }

  ngOnInit() {
    this.configuration = null;
    this.formRecognitionConfigurationService.getFormRecognitionConfigurationByResource(this.configurationUrl).subscribe((configuration) => {
      this.configuration = configuration;
      this.modelUrl = this.cacheBustedModelUrl(configuration._links?.formReferenceImage?.href);
    });
  }

  openModifyFormRecognitionConfiguration() {
    const modalRef = this.dialogService.open(ModifyFormRecognitionConfigurationComponent, {
      data: {
        challengeName: this.challengeName,
        configuration: this.configuration
      }
    });
    modalRef.result.then((result) => {
      if (!result) { return; }
      this.formRecognitionConfigurationService.updateFormRecognitionConfiguration(result as FormData).subscribe(data => {
        this.configuration = data;
        this.modelUrl = this.cacheBustedModelUrl(data._links?.formReferenceImage?.href);
      }, () => {
        // keep current configuration on error
      });
    }).catch(() => {
      // dialog dismissed
    });
  }

  deleteFormRecognitionConfiguration() {
    this.confirmationDialogService.confirm(
      'Suppression d\'une page de formulaire de réponses',
      'Supprimer la page n°' + this.configuration.page + ' du formulaire de réponses de l\'épreuve ' + this.configuration.challenge + '\u00A0?',
      'Oui', 'Non')
      .then((confirmed) => {
        if (confirmed) {
          this.formRecognitionConfigurationService.deleteFormRecognitionConfiguration(this.configuration.id).subscribe(() => {
            this.deleteEvent.emit({ id: this.configuration.id });
          });
        }
      })
      .catch(() => {
        // dialog dismissed
      });
  }

  private cacheBustedModelUrl(href?: string): string {
    if (!href) { return ''; }
    const separator = href.includes('?') ? '&' : '?';
    return `${href}${separator}v=${Date.now()}`;
  }
}
