import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-carousel-response-file',
  templateUrl: './carousel-response-file.component.html',
  styleUrls: ['./carousel-response-file.component.scss']
})
export class CarouselResponseFileComponent implements OnInit {
  @Input() responseFiles: any[];

  constructor() { }

  ngOnInit() {
  }

  delete(responseFile) {
    const idx = this.responseFiles.findIndex(r => r.id === responseFile.id);
    if (idx) {
      this.responseFiles.splice(idx, 1);
    }
  }
}
