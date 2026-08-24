import { Component, ElementRef, Inject, Input, OnInit, Optional, ViewChild } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormRecognitionConfiguration } from '../models/form-recognition-configuration';

interface ModifyFormRecognitionConfigurationDialogData {
  configuration: FormRecognitionConfiguration;
  challengeName?: string;
}

@Component({
  selector: 'app-modify-form-recognition-configuration',
  templateUrl: './modify-form-recognition-configuration.component.html',
  styleUrls: ['./modify-form-recognition-configuration.component.scss']
})
export class ModifyFormRecognitionConfigurationComponent implements OnInit {

  @Input() configuration: FormRecognitionConfiguration | null = null;
  @Input() challengeName = '';
  @ViewChild('labelImportText')
  labelImportText: ElementRef;
  @ViewChild('labelImportModelText')
  labelImportModelText: ElementRef;

  templateFile: File | null = null;
  formReferenceImage: File | null = null;
  modelRequiredError = false;
  templateFileError = false;
  modelFileError = false;
  templateRequiredError = false;
  isSubmitting = false;
  submitErrorMessage = '';
  challengeDisplay: number | null = null;
  challengeNameDisplay = '';
  myForm: UntypedFormGroup;
  configurationDraft: FormRecognitionConfiguration;
  modelUrl: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<ModifyFormRecognitionConfigurationComponent>,
    private formBuilder: UntypedFormBuilder,
    @Optional() @Inject(MAT_DIALOG_DATA) private data?: ModifyFormRecognitionConfigurationDialogData
  ) { }

  ngOnInit() {
    if (!this.configuration && this.data?.configuration) {
      this.configuration = this.data.configuration;
    }
    if (!this.challengeName && this.data?.challengeName) {
      this.challengeName = this.data.challengeName;
    }
    if (!this.configuration) {
      this.dialogRef.close();
      return;
    }

    this.createForm();
    this.challengeDisplay = this.configuration.challenge ?? null;
    this.challengeNameDisplay = this.challengeName ?? '';
    this.configurationDraft = JSON.parse(JSON.stringify(this.configuration));
    this.modelRequiredError = false;
    this.templateFileError = false;
    this.modelFileError = false;
    this.templateRequiredError = false;
    const href = this.configuration._links?.formReferenceImage?.href;
    if (href) {
      try {
        const url = new URL(href, window.location.origin);
        this.modelUrl = `/api${url.pathname}${url.search}`;
      } catch {
        this.modelUrl = href;
      }
    }
  }

  private createForm() {
    this.myForm = this.formBuilder.group({
      page: [this.configuration.page, [Validators.required, Validators.min(1)]],
      template: [this.configuration.template ?? ''],
      templateFile: '',
      formReferenceImage: ''
    });
  }

  async submitForm() {
    if (this.isSubmitting) {
      return;
    }
    if (!this.myForm || !this.configuration) {
      this.submitErrorMessage = 'Le formulaire n\'est pas correctement initialise.';
      return;
    }

    this.submitErrorMessage = '';
    this.templateRequiredError = false;
    this.modelRequiredError = false;
    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      this.submitErrorMessage = 'Le numero de page est invalide.';
      return;
    }

    if (!this.configuration?.id && !this.formReferenceImage) {
      this.modelRequiredError = true;
      this.submitErrorMessage = 'Le modele de feuille est obligatoire.';
      return;
    }

    this.isSubmitting = true;
    try {
      let templateContent = typeof this.myForm.value.template === 'string' ? this.myForm.value.template : '';
      if (this.templateFile) {
        try {
          templateContent = await this.readTextFile(this.templateFile);
        } catch {
          this.templateRequiredError = true;
          this.submitErrorMessage = 'Impossible de lire le template.';
          return;
        }
      }
      if (!templateContent.trim()) {
        this.templateRequiredError = true;
        this.submitErrorMessage = 'Le template est obligatoire.';
        return;
      }

      const formData = new FormData();
      const data = {
        id: this.configuration.id,
        challenge: this.configuration.challenge,
        page: Number(this.myForm.value.page),
        template: templateContent
      };
      formData.append('formRecognitionConfiguration', JSON.stringify(data));
      if (this.formReferenceImage) {
        formData.append('formReferenceImage', this.formReferenceImage);
      }
      this.dialogRef.close(formData);
    } catch (error) {
      console.error('submitForm error', error);
      this.submitErrorMessage = 'Une erreur technique empêche la validation.';
    } finally {
      this.isSubmitting = false;
    }
  }

  selectFile(files: FileList | null | undefined) {
    if (files && files.length > 0) {
      const selectedFile = files.item(0);
      if (!selectedFile || !this.isTemplateFile(selectedFile)) {
        this.templateFile = null;
        this.templateFileError = true;
        this.templateRequiredError = false;
        if (this.labelImportText?.nativeElement) {
          this.labelImportText.nativeElement.innerText = '';
        }
        return;
      }
      this.templateFile = selectedFile;

      this.templateFileError = false;
      this.templateRequiredError = false;
      this.isSubmitting = false;
      this.submitErrorMessage = '';
      const names = Array.from(files).map(f => f.name).join(', ');
      if (this.labelImportText?.nativeElement) {
        this.labelImportText.nativeElement.innerText = names;
      }
    }
  }

  selectFileModel(files: FileList | null | undefined) {
    if (files && files.length > 0) {
      const selectedFile = files.item(0);
      if (!selectedFile || !this.isImageFile(selectedFile)) {
        this.formReferenceImage = null;
        this.modelFileError = true;
        this.modelRequiredError = !this.configuration?.id;
        if (this.labelImportModelText?.nativeElement) {
          this.labelImportModelText.nativeElement.innerText = '';
        }
        return;
      }
      this.formReferenceImage = selectedFile;

      this.modelFileError = false;
      this.modelRequiredError = false;
      this.isSubmitting = false;
      this.submitErrorMessage = '';
      const names = Array.from(files).map(f => f.name).join(', ');
      if (this.labelImportModelText?.nativeElement) {
        this.labelImportModelText.nativeElement.innerText = names;
      }
      const reader = new FileReader();

      reader.onload = () => {
        this.modelUrl = String(reader.result ?? '');
        if (!this.modelUrl) {
          return;
        }
        const img = new Image();
        img.onload = () => {
          this.configurationDraft.width = img.width;
          this.configurationDraft.height = img.height;
          console.log(this.configurationDraft.width);
          console.log(this.configurationDraft.height);
          this.configurationDraft = Object.assign({}, this.configurationDraft);
        };
        img.src = this.modelUrl;
        console.log(this.modelUrl);
        this.configurationDraft = Object.assign({}, this.configurationDraft);
      };
      reader.readAsDataURL(this.formReferenceImage);
    }
  }

  private isTemplateFile(file: File): boolean {
    const fileName = (file?.name ?? '').toLowerCase();
    return fileName.endsWith('.xtmpl') || fileName.endsWith('.xml');
  }

  private isImageFile(file: File): boolean {
    const fileName = (file?.name ?? '').toLowerCase();
    return (file?.type ?? '').startsWith('image/')
      || fileName.endsWith('.png')
      || fileName.endsWith('.jpg')
      || fileName.endsWith('.jpeg')
      || fileName.endsWith('.gif')
      || fileName.endsWith('.bmp')
      || fileName.endsWith('.webp')
      || fileName.endsWith('.tif')
      || fileName.endsWith('.tiff');
  }

  private readTextFile(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      const timeout = setTimeout(() => reject(new Error('timeout')), 10000);
      reader.onload = () => {
        clearTimeout(timeout);
        resolve(String(reader.result ?? ''));
      };
      reader.onerror = () => {
        clearTimeout(timeout);
        reject(reader.error ?? new Error('read error'));
      };
      reader.onabort = () => {
        clearTimeout(timeout);
        reject(new Error('read aborted'));
      };
      reader.readAsText(file);
    });
  }
}
