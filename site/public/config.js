/* Edite este arquivo: contatos, datas ocupadas, vídeos e fotos. */
var CONFIG={whatsapp:'24981031775',instagram:'',email:'nsmunizinfodev@gmail.com',cidade:'',
  gcal:{endpoint:'/api/agenda'}};   /* Google Agenda: veja AGENDA-GOOGLE.txt (a leitura é feita por /api/agenda, que só devolve as datas ocupadas) */   /* whatsapp: DDD + número, só dígitos (o 55 do país é acrescentado sozinho no link) */
var HERO=[];       /* fotos de fundo da página inicial (trocam suavemente): HERO=[{src:'img/capa1.jpg'},{src:'img/capa2.jpg'}] */
var BOOKED=[];     /* datas ocupadas, formato 'AAAA-MM-DD' */
var VIDEOS=[];     /* {titulo:'', tipo:'Casamento', url:'link do vídeo (YouTube, Instagram...)', src:'arquivo .mp4 do site', poster:''} */
var PHOTOS={};     /* por nicho: PHOTOS['casamentos']=[{src:'foto.jpg',alt:'...'}] */
/* ======================== */
