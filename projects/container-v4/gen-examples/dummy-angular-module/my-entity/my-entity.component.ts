import { Component, EventEmitter, HostBinding, Input, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
// import { _ } from 'tnp-core';

@Component({
  selector: 'app-my-entity',
  templateUrl: './my-entity.component.html',
  styleUrls: ['./my-entity.component.scss']
})
export class MyEntityComponent {
  @HostBinding('style.minHeight.px') @Input() height: number = 100;
  handlers: Subscription[] = [];
  @Output() myEntityDataChanged = new EventEmitter();
  @Input() myEntityData: any = {};

  constructor() { }

  ngOnInit() {
  }

  ngOnDestroy(): void {
    this.handlers.forEach(h => h.unsubscribe());
  }

}

