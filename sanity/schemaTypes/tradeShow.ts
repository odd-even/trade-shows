import {defineField, defineType} from 'sanity'

export const tradeShowType = defineType({
  name: 'tradeShow',
  title: 'Trade Show',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug / ID',
      type: 'slug',
      options: {source: 'title', maxLength: 64},
      validation: (rule) => rule.required(),
      description: 'Stable id used by the embed (e.g. cultivate, gcc-expo).',
    }),
    defineField({
      name: 'tag',
      title: 'Tag',
      type: 'string',
      initialValue: 'TRADE SHOW',
    }),
    defineField({
      name: 'start',
      title: 'Start date',
      type: 'date',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'end',
      title: 'End date',
      type: 'date',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'city',
      title: 'City',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'booth',
      title: 'Booth',
      type: 'string',
    }),
    defineField({
      name: 'venue',
      title: 'Venue',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'address',
      title: 'Address',
      type: 'string',
    }),
    defineField({
      name: 'url',
      title: 'Show website',
      type: 'url',
    }),
    defineField({
      name: 'imageUrl',
      title: 'Image URL',
      type: 'url',
      validation: (rule) => rule.required(),
      description: 'Full-bleed card photo. Prefer a CDN URL.',
    }),
    defineField({
      name: 'image',
      title: 'Image (upload)',
      type: 'image',
      options: {hotspot: true},
      description: 'Optional upload. If set, overrides Image URL on the site.',
    }),
    defineField({
      name: 'accent',
      title: 'Accent color',
      type: 'string',
      initialValue: '#152438',
      description: 'Hex color for the frosted bottom gradient (e.g. #152438).',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 5,
    }),
    defineField({
      name: 'published',
      title: 'Published',
      type: 'boolean',
      initialValue: true,
      description: 'Uncheck to hide from the public embed without deleting.',
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort order',
      type: 'number',
      description: 'Optional. Lower numbers appear first within the same year. Default is date order.',
    }),
  ],
  orderings: [
    {
      title: 'Start date',
      name: 'startAsc',
      by: [{field: 'start', direction: 'asc'}],
    },
  ],
  preview: {
    select: {
      title: 'title',
      city: 'city',
      booth: 'booth',
      start: 'start',
      media: 'image',
      published: 'published',
    },
    prepare({title, city, booth, start, media, published}) {
      const boothBit = booth ? ` · Booth ${booth}` : ''
      return {
        title: published === false ? `[hidden] ${title}` : title,
        subtitle: `${start || '?'} · ${city || ''}${boothBit}`,
        media,
      }
    },
  },
})

export const scheduleSettingsType = defineType({
  name: 'scheduleSettings',
  title: 'Schedule Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Public title',
      type: 'string',
      initialValue: 'Trade Shows',
    }),
    defineField({
      name: 'year',
      title: 'Primary year label',
      type: 'number',
      initialValue: 2026,
    }),
  ],
  preview: {
    prepare() {
      return {title: 'Schedule Settings'}
    },
  },
})
