import { Component, OnInit, Input, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-modify-responce-file-param',
  templateUrl: './modify-responce-file-param.component.html',
  styleUrls: ['./modify-responce-file-param.component.scss']
})
export class ModifyResponceFileParamComponent implements OnInit {

  @Input() param: any;
  @ViewChild('labelImport', { static: false })
  labelImport: ElementRef;

  templateFile: File;
  myForm: FormGroup;
  detailsParam = { template: '', img: '' };

  constructor(public activeModal: NgbActiveModal,
    private formBuilder: FormBuilder) { }

  ngOnInit() {
    this.detailsParam.template = this.param.template;
    this.detailsParam.img = 'http://localhost:8080/downloadResponceFile/5dbec6971e2d1d78a85ce97b';
    this.createForm();
  }

  private createForm() {
    this.myForm = this.formBuilder.group({
      stage: this.param.stage,
      page: this.param.page,
      template: this.param.template,
      templateFile: ''
    });
  }

  private submitForm() {
    this.activeModal.close(this.myForm.value);
  }

  selectFile(files: FileList) {
    this.labelImport.nativeElement.innerText = Array.from(files)
      .map(f => f.name)
      .join(', ');
    this.templateFile = files.item(0);
    const myReader = new FileReader();
    myReader.onloadend = (e) => {
      this.myForm.patchValue({ template: myReader.result });
      this.detailsParam = { template: myReader.result.toString(), img: this.detailsParam.img };
    };
    myReader.readAsText(this.templateFile);
  }
}
