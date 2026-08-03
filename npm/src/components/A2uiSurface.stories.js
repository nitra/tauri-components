import A2uiSurface from './A2uiSurface.vue'
import { SAMPLE_SIDEBAR_STREAM } from '../a2ui/validate.js'

export default {
  title: 'A2UI/A2uiSurface',
  component: A2uiSurface
}

export const SampleSidebar = {
  args: {
    messages: SAMPLE_SIDEBAR_STREAM
  }
}

export const InvalidCatalog = {
  args: {
    messages: [
      {
        version: 'v1.0',
        createSurface: {
          surfaceId: 's',
          catalogId: 'evil.catalog',
          components: [{ id: 'root', component: 'Text', text: 'should not render' }]
        }
      }
    ]
  }
}
