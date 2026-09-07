import { FieldLabel, FormRow, TextInput } from './FormField'
import { AddressFields } from './AddressFields'

export default function PartyForm({ variant = 'customer', form, onChange }) {
  function update(patch) {
    onChange({ ...form, ...patch })
  }

  if (variant === 'vendor') {
    return (
      <>
        <div>
          <FieldLabel required>Vendor Name</FieldLabel>
          <TextInput
            required
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Vendor / supplier name"
          />
        </div>

        <FormRow cols={2}>
          <div>
            <FieldLabel>Contact Person</FieldLabel>
            <TextInput
              value={form.contact_person}
              onChange={(e) => update({ contact_person: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel>Phone</FieldLabel>
            <TextInput value={form.phone} onChange={(e) => update({ phone: e.target.value })} />
          </div>
        </FormRow>

        <FormRow cols={2}>
          <div>
            <FieldLabel>Email</FieldLabel>
            <TextInput
              type="email"
              value={form.email}
              onChange={(e) => update({ email: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel>GST Number</FieldLabel>
            <TextInput
              value={form.gst_number}
              onChange={(e) => update({ gst_number: e.target.value })}
            />
          </div>
        </FormRow>

        <AddressFields value={form} onChange={update} />
      </>
    )
  }

  return (
    <>
      <FormRow cols={2}>
        <div>
          <FieldLabel required>Customer Name</FieldLabel>
          <TextInput
            required
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </div>
        <div>
          <FieldLabel required>Business Name</FieldLabel>
          <TextInput
            required
            value={form.business_name}
            onChange={(e) => update({ business_name: e.target.value })}
          />
        </div>
      </FormRow>

      <FormRow cols={2}>
        <div>
          <FieldLabel>Contact Person</FieldLabel>
          <TextInput
            value={form.contact_person}
            onChange={(e) => update({ contact_person: e.target.value })}
          />
        </div>
        <div>
          <FieldLabel>Phone</FieldLabel>
          <TextInput value={form.phone} onChange={(e) => update({ phone: e.target.value })} />
        </div>
      </FormRow>

      <FormRow cols={2}>
        <div>
          <FieldLabel>Mobile Number 2</FieldLabel>
          <TextInput
            value={form.mobile_number_2}
            onChange={(e) => update({ mobile_number_2: e.target.value })}
          />
        </div>
        <div>
          <FieldLabel>Email</FieldLabel>
          <TextInput
            type="email"
            value={form.email}
            onChange={(e) => update({ email: e.target.value })}
          />
        </div>
      </FormRow>

      <FormRow cols={2}>
        <div>
          <FieldLabel>GST Number</FieldLabel>
          <TextInput
            value={form.gst_number}
            onChange={(e) => update({ gst_number: e.target.value })}
          />
        </div>
        <div>
          <FieldLabel required>Margin (%)</FieldLabel>
          <TextInput
            required
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.margin}
            onChange={(e) => update({ margin: e.target.value })}
          />
        </div>
      </FormRow>

      <AddressFields value={form} onChange={update} />
    </>
  )
}
