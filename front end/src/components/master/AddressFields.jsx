import { FieldLabel, FormRow, Select, TextInput } from './FormField'
import { INDIAN_STATES } from '../../lib/constants'

export function AddressFields({ value, onChange, fullName, disabled, required = false }) {
  return (
    <>
      {fullName && (
        <div>
          <FieldLabel required={required}>{fullName.label || 'Full Name'}</FieldLabel>
          <TextInput
            required={required}
            disabled={disabled}
            value={fullName.value || ''}
            onChange={(e) => fullName.onChange(e.target.value)}
            placeholder="Recipient's full name"
          />
        </div>
      )}

      <FormRow cols={2}>
        <div>
          <FieldLabel required={required}>Address Line 1</FieldLabel>
          <TextInput
            required={required}
            disabled={disabled}
            value={value.address_line1 || ''}
            onChange={(e) => onChange({ address_line1: e.target.value })}
            placeholder="House/Flat no., Street"
          />
        </div>
        <div>
          <FieldLabel>Address Line 2</FieldLabel>
          <TextInput
            disabled={disabled}
            value={value.address_line2 || ''}
            onChange={(e) => onChange({ address_line2: e.target.value })}
            placeholder="Landmark, area (optional)"
          />
        </div>
      </FormRow>

      <FormRow cols={2}>
        <div>
          <FieldLabel required={required}>City</FieldLabel>
          <TextInput
            required={required}
            disabled={disabled}
            value={value.city || ''}
            onChange={(e) => onChange({ city: e.target.value })}
            placeholder="e.g. Bengaluru"
          />
        </div>
        <div>
          <FieldLabel required={required}>State</FieldLabel>
          <Select
            required={required}
            disabled={disabled}
            value={value.state || ''}
            onChange={(e) => onChange({ state: e.target.value })}
          >
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </FormRow>

      <FormRow cols={2}>
        <div>
          <FieldLabel required={required}>Pincode</FieldLabel>
          <TextInput
            required={required}
            disabled={disabled}
            value={value.pincode || ''}
            onChange={(e) => onChange({ pincode: e.target.value })}
            placeholder="560001"
          />
        </div>
      </FormRow>
    </>
  )
}
