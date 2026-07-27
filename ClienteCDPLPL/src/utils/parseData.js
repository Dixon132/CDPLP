import dayjs from 'dayjs'
import 'dayjs/locale/es'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

const parseDate = (date)=>{
    const legible = dayjs.utc(date).locale('es').format('DD [de] MMMM [de] YYYY')
    return legible
}
export default parseDate