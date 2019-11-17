import { Component, OnInit } from '@angular/core';
import { UploadFileService } from '../upload-file.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-list-upload',
  templateUrl: './list-upload.component.html',
  styleUrls: ['./list-upload.component.scss']
})
export class ListUploadComponent implements OnInit {
  fileUploads: Observable<any[]>;

  constructor(private uploadService: UploadFileService) { }

  ngOnInit() {
    this.fileUploads = this.uploadService.getFiles();
  }
}
