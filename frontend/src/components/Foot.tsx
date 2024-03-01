import { styled } from '@mui/system';

const Footer = styled('footer')(({theme})=>`
  background-color:${theme.palette.background.dark}80;
  padding: 5px;
  position: fixed; 
  bottom: 0;
  right: 0;
  border-top-left-radius: 20px; 
  width: 200px;
  text-align: center;
`);
function Foot() {
  return (
    <Footer className=''>Build: {import.meta.env.VITE_COMMIT_HASH}</Footer>
  )
}

export default Foot