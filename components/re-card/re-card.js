Component({
  options: { multipleSlots: true },
  properties: {
    title: { type: String, value: '' },
    bordered: { type: Boolean, value: false },
    tappable: { type: Boolean, value: false }
  },
  methods: {
    onTap() {
      if (this.data.tappable) this.triggerEvent('tap')
    }
  }
})
