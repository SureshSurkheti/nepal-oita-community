'use client'

import { useState, useTransition } from 'react'
import { addMember, type ActionResult } from '@/app/admin/members/actions'
import { Icon } from './Sprite'

export function AddMemberForm() {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<ActionResult | null>(null)

  return (
    <form
      className="panel mt-lg reveal"
      action={(formData) =>
        startTransition(async () => {
          const r = await addMember(formData)
          setResult(r)
          if (r.ok) (document.getElementById('add-member') as HTMLFormElement | null)?.reset()
        })
      }
      id="add-member"
    >
      <h2 className="panel__title"><Icon name="user-plus" /> Add a member</h2>

      <div className="grid grid--2">
        <div className="field">
          <label htmlFor="m-name">Name</label>
          <input id="m-name" name="name" type="text" required placeholder="Ganga Bahadur Tamang" />
        </div>
        <div className="field">
          <label htmlFor="m-phone">Mobile number <span className="muted">(optional now)</span></label>
          <input id="m-phone" name="phone" type="tel" inputMode="tel" placeholder="080 0000 0000" />
        </div>
        <div className="field">
          <label htmlFor="m-role">Role <span className="muted">(leave blank for a general member)</span></label>
          <input id="m-role" name="role" type="text" placeholder="Vice President" />
        </div>
        <div className="field">
          <label htmlFor="m-category">In which list</label>
          <select id="m-category" name="category" defaultValue="general">
            <option value="leadership">Leadership team</option>
            <option value="general">General members</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="m-profession">Profession <span className="muted">(they can set this themselves)</span></label>
          <input id="m-profession" name="profession" type="text" placeholder="Care worker" />
        </div>
        <div className="field">
          <label htmlFor="m-sort">Position in the list</label>
          <input id="m-sort" name="sort_order" type="number" defaultValue={100} min={1} max={999} />
        </div>
      </div>

      <button className="btn btn--primary" type="submit" disabled={pending}>
        <Icon name="check" />
        {pending ? 'Adding…' : 'Add member'}
      </button>

      {result && (
        <p className={`form-note${result.ok ? '' : ' form-note--error'}`}>{result.message}</p>
      )}

      <p className="form-note">
        The number is stored in the database, never in the site&rsquo;s files. Members
        see each other&rsquo;s numbers; the public never receives them.
      </p>
    </form>
  )
}
