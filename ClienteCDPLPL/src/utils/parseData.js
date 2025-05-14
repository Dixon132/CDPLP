import dayjs from 'dayjs'
import 'dayjs/locale/es'
const parseDate = (date)=>{
    const legible = dayjs(date).locale('es').format('DD [de] MMMM [de] YYYY')
    return legible
}
export default parseDate