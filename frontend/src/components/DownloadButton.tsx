import * as zip from "@zip.js/zip.js";
import { StemData } from './EditorTracks';
import { SongData } from "../routes/Editor";
import { useQuery } from "@tanstack/react-query";
import { useAxios } from '../hooks/useAxios';
import { useSession } from '../hooks/useSession';
import { YellowButton } from "./NavbarButton";
import { DownloadRounded } from "@mui/icons-material";
import { useState } from "react";

interface DownloadButtonProps {
  songData: SongData;
}

function DownloadButton(props: DownloadButtonProps){  
  const axios = useAxios();
  const session = useSession();

  const [processing,setProcessing] = useState(false);
  const stemQuery = useQuery(['stems', props.songData?.slug], async () => {
    const { data } = await axios.get(`/api/songs/by-slug/${props.songData?.slug}/stems`);
    return data;
  }, { staleTime: Infinity });

  const handleAllStemDownload = async () =>{
    if(stemQuery.status === 'success'){
      setProcessing(true);
      const writer = new zip.ZipWriter(new zip.BlobWriter('application/zip'), { bufferedWrite: true });
      for(const stem of (stemQuery.data as StemData[])){
        const path = `${session.stemLocationPrefix}/${stem.losslessPath}`;
        var content = await axios.get(path,{responseType: 'blob'});
        await writer.add(`${stem.name}.flac`,new zip.BlobReader(content.data));
      }
      const anchor = document.createElement('a');
      anchor.href = URL.createObjectURL(await writer.close());
      anchor.download = `${props.songData?.title}-stems.zip`;
      anchor.click();            
      anchor.remove();
      setProcessing(false);
    }
  }

  return <YellowButton onClick={handleAllStemDownload} disabled={processing}> <DownloadRounded /> Pobierz stemy</YellowButton>;
}

export default DownloadButton;