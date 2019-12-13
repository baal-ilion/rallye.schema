import { Component, OnInit, Input, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-modify-response-file-param',
  templateUrl: './modify-response-file-param.component.html',
  styleUrls: ['./modify-response-file-param.component.scss']
})
export class ModifyResponseFileParamComponent implements OnInit {

  @Input() param: any;
  @ViewChild('labelImport', { static: false })
  labelImport: ElementRef;
  @ViewChild('labelImportModel', { static: false })
  labelImportModel: ElementRef;

  templateFile: File;
  responseFileModel: File;
  myForm: FormGroup;
  detailsParam: any;

  constructor(public activeModal: NgbActiveModal, private formBuilder: FormBuilder) { }

  ngOnInit() {
    this.detailsParam = JSON.parse(JSON.stringify(this.param));
    if (this.param._links) {
      this.detailsParam.img = this.param._links.responseFileModel.href;
    } else {
      this.detailsParam.img = null;
    }
    this.createForm();
  }

  private createForm() {
    this.myForm = this.formBuilder.group({
      stage: this.param.stage,
      page: this.param.page,
      template: this.param.template,
      templateFile: '',
      responseFileModel: ''
    });
  }

  private submitForm() {
    const formData = new FormData();
    const data = {
      id: this.param.id,
      stage: this.myForm.value.stage,
      page: this.myForm.value.page,
      template: this.myForm.value.template
    };
    formData.append('responseFileParam', JSON.stringify(data));
    formData.append('responseFileModel', this.responseFileModel);
    this.activeModal.close(formData);
  }

  selectFile(files: FileList) {
    if (files.length > 0) {
      this.labelImport.nativeElement.innerText = Array.from(files)
        .map(f => f.name)
        .join(', ');
      this.templateFile = files.item(0);
      const myReader = new FileReader();
      myReader.onloadend = (e) => {
        this.myForm.patchValue({ template: myReader.result });
        this.detailsParam.template = myReader.result.toString();
        this.detailsParam = Object.assign({}, this.detailsParam);
      };
      myReader.readAsText(this.templateFile);
    }
  }

  selectFileModel(files: FileList) {
    if (files.length > 0) {
      this.labelImportModel.nativeElement.innerText = Array.from(files)
        .map(f => f.name)
        .join(', ');
      this.responseFileModel = files.item(0);
      const reader = new FileReader();

      reader.onload = (e) => {
        this.detailsParam.img = reader.result.toString();
        const img = new Image();
        img.onload = () => {
          this.detailsParam.width = img.width;
          this.detailsParam.height = img.height;
          console.log(this.detailsParam.width);
          console.log(this.detailsParam.height);
          this.detailsParam = Object.assign({}, this.detailsParam);
        };
        img.src = this.detailsParam.img;
        console.log(this.detailsParam.img);
        this.detailsParam = Object.assign({}, this.detailsParam);
      };
      reader.readAsDataURL(this.responseFileModel);
    }
  }
}
