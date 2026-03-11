import { useEffect, useMemo, useState } from 'react'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';

function App() {
  const [appointments, setAppointments] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [budget, setBudget] = useState('medium')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    id: '',
    title: '',
    dateTime: '',
    locationName: '',
    locationAddress: '',
    estimatedCost: 0,
    notes: '',
    status: 'planned',
    createdBySuggestion: false,
  })

  const isEditing = useMemo(() => Boolean(form.id), [form.id])

  const apiRequest = async (url, options = {}) => {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.message || 'Request failed')
    }

    return response.json()
  }

  const resetForm = () => {
    setForm({
      id: '',
      title: '',
      dateTime: '',
      locationName: '',
      locationAddress: '',
      estimatedCost: 0,
      notes: '',
      status: 'planned',
      createdBySuggestion: false,
    })
  }

  const loadAppointments = async () => {
    const data = await apiRequest('/api/appointments')
    setAppointments(data.appointments || [])
  }

  const loadSuggestions = async () => {
    const data = await apiRequest(`/api/appointments/suggestions?budget=${budget}`)
    setSuggestions(data.suggestions || [])
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      await Promise.all([loadAppointments(), loadSuggestions()])
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budget])

  const onInputChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: name === 'estimatedCost' ? Number(value) : value,
    }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()

    const payload = {
      title: form.title,
      dateTime: form.dateTime,
      locationName: form.locationName,
      locationAddress: form.locationAddress,
      estimatedCost: Number(form.estimatedCost || 0),
      notes: form.notes,
      status: form.status,
      createdBySuggestion: form.createdBySuggestion,
    }

    try {
      setError('')

      if (isEditing) {
        await apiRequest(`/api/appointments/${form.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      } else {
        await apiRequest('/api/appointments', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }

      resetForm()
      await loadAppointments()
    } catch (submitError) {
      setError(submitError.message)
    }
  }

  const onDelete = async (id) => {
    try {
      setError('')
      await apiRequest(`/api/appointments/${id}`, { method: 'DELETE' })
      await loadAppointments()
      if (form.id === id) {
        resetForm()
      }
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  const onEdit = (item) => {
    const isoValue = new Date(item.dateTime).toISOString().slice(0, 16)
    setForm({
      id: item._id,
      title: item.title,
      dateTime: isoValue,
      locationName: item.locationName,
      locationAddress: item.locationAddress || '',
      estimatedCost: item.estimatedCost || 0,
      notes: item.notes || '',
      status: item.status || 'planned',
      createdBySuggestion: Boolean(item.createdBySuggestion),
    })
  }

  const onUseSuggestion = (item) => {
    const isoValue = new Date(item.dateTime).toISOString().slice(0, 16)
    setForm({
      id: '',
      title: item.title,
      dateTime: isoValue,
      locationName: item.locationName,
      locationAddress: item.locationAddress || '',
      estimatedCost: item.estimatedCost || 0,
      notes: item.notes || '',
      status: 'planned',
      createdBySuggestion: true,
    })
  }

  const formatDate = (value) => new Date(value).toLocaleString('vi-VN')
  const formatCurrency = (value) => Number(value || 0).toLocaleString('vi-VN')

  return (
    <div className='page'>
      <header className='topbar'>
        <h1>Lich Hen Dating</h1>
        <p>Goi y dia diem, thoi gian va chi phi. Quan ly lich hen truc tuyen theo tai khoan cua ban.</p>
      </header>

      <SignedOut>
        <div className='auth-card'>
          <p>Vui long dang nhap de xem va quan ly lich hen.</p>
          <SignInButton mode='modal'/>
        </div>
      </SignedOut>

      <SignedIn>
        <section className='auth-row'>
          <UserButton />
          <button type='button' onClick={loadData}>Lam moi</button>
        </section>

        <section className='grid'>
          <article className='card'>
            <div className='card-title-row'>
              <h2>Goi y lich hen</h2>
              <select value={budget} onChange={(e) => setBudget(e.target.value)}>
                <option value='low'>Ngan sach thap</option>
                <option value='medium'>Ngan sach vua</option>
                <option value='high'>Ngan sach cao</option>
              </select>
            </div>

            {loading ? <p>Dang tai du lieu...</p> : null}

            <div className='list'>
              {suggestions.map((item, index) => (
                <div key={`${item.locationName}-${index}`} className='list-item'>
                  <h3>{item.title}</h3>
                  <p>{item.locationName}</p>
                  <p>{item.locationAddress}</p>
                  <p>{formatDate(item.dateTime)}</p>
                  <p>Du kien: {formatCurrency(item.estimatedCost)} VND</p>
                  <button type='button' onClick={() => onUseSuggestion(item)}>Chon goi y nay</button>
                </div>
              ))}
              {!suggestions.length && !loading ? <p>Chua co goi y.</p> : null}
            </div>
          </article>

          <article className='card'>
            <h2>{isEditing ? 'Chinh sua lich hen' : 'Tao lich hen moi'}</h2>

            <form className='form' onSubmit={onSubmit}>
              <input name='title' value={form.title} onChange={onInputChange} placeholder='Tieu de' required />
              <input name='dateTime' value={form.dateTime} onChange={onInputChange} type='datetime-local' required />
              <input name='locationName' value={form.locationName} onChange={onInputChange} placeholder='Dia diem' required />
              <input name='locationAddress' value={form.locationAddress} onChange={onInputChange} placeholder='Dia chi (tu chon)' />
              <input name='estimatedCost' value={form.estimatedCost} onChange={onInputChange} type='number' min='0' placeholder='Chi phi du kien' />

              <select name='status' value={form.status} onChange={onInputChange}>
                <option value='planned'>Planned</option>
                <option value='confirmed'>Confirmed</option>
                <option value='completed'>Completed</option>
                <option value='cancelled'>Cancelled</option>
              </select>

              <textarea name='notes' value={form.notes} onChange={onInputChange} placeholder='Ghi chu' rows='4' />

              <div className='form-actions'>
                <button type='submit'>{isEditing ? 'Cap nhat' : 'Tao lich hen'}</button>
                <button type='button' onClick={resetForm}>Reset</button>
              </div>
            </form>
          </article>
        </section>

        <section className='card'>
          <h2>Danh sach lich hen</h2>
          <div className='list'>
            {appointments.map((item) => (
              <div className='list-item' key={item._id}>
                <h3>{item.title}</h3>
                <p>{item.locationName}</p>
                <p>{item.locationAddress}</p>
                <p>{formatDate(item.dateTime)}</p>
                <p>Trang thai: {item.status}</p>
                <p>Du kien: {formatCurrency(item.estimatedCost)} VND</p>
                <div className='item-actions'>
                  <button type='button' onClick={() => onEdit(item)}>Sua</button>
                  <button type='button' className='danger' onClick={() => onDelete(item._id)}>Xoa</button>
                </div>
              </div>
            ))}
            {!appointments.length ? <p>Chua co lich hen nao.</p> : null}
          </div>
        </section>

        {error ? <p className='error'>{error}</p> : null}
      </SignedIn>
    </div>
  )
}

export default App
