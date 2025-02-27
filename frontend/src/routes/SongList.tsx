import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AxiosError } from 'axios';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AddIcon from '@mui/icons-material/Add';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { styled } from '@mui/system';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import LoadingBar from '../components/LoadingBar';
import Modal from '../components/Modal';
import Navbar from "../components/Navbar";
import { GreenButton, YellowButton, RedButton } from "../components/NavbarButton";
import SolidBackgroundFrame from "../components/SolidBackgroundFrame";
import SongAddEditModal from '../components/SongAddEditModal';

import { useAxios } from '../hooks/useAxios';
import { useSession } from "../hooks/useSession";
import Foot from '../components/Foot';

function reversed<T>(array: T[]): T[] {
  return array.slice().reverse();
}

const MainSection = styled('section')(({ theme }) => ({
  boxSizing: 'border-box',
  padding: `0px ${theme.spacing(4)}`,
  width: 1100,
  maxWidth: '100%',
}));

const MainHeader = styled('h1')(() => ({
  fontSize: 36,
}));

const SongFrame = styled('div')(({ theme }) => ({
  boxSizing: 'border-box',
  background: theme.palette.background.light,
  padding: `${theme.spacing(2)} ${theme.spacing(3)}`,
  borderRadius: theme.spacing(2),
  marginBottom: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  transition: '0.1s',
}));

const SongTitle = styled('h2')(({ theme }) => ({
  margin: 0,
  marginBottom: theme.spacing(0.5),
  fontWeight: 700,
  fontSize: 24,
}));

const SongDetails = styled('div')(({ theme }) => ({
  fontSize: 18,
  display: 'flex',
  alignItems: 'center',
  '*': {
    marginRight: theme.spacing(0.5),
    letterSpacing: 1,
  },
  marginBottom: theme.spacing(1),
}));

const SongActions = styled('div')(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  'button': {
    margin: theme.spacing(0.5),
    background: theme.palette.background.hover,
  },
}));

interface SongProps {
  slug: string;
  title: string;
  bpm: number;
  stemCount: number;
  duration: number;
  onPlay?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

interface SongResponse extends SongProps {
  id: number;
}

function Song(props: SongProps) {
  const roundedDuration = Math.round(props.duration);
  const minutes = Math.floor(roundedDuration / 60);
  const seconds = roundedDuration % 60;
  const time = minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');

  return (
    <SongFrame>
      <SongTitle>{props.title}</SongTitle>
      <SongDetails>
        <LibraryMusicIcon titleAccess='Liczba ścieżek' />
        <span>{props.stemCount}</span>
        <span></span>
        <AccessTimeIcon titleAccess='Czas trwania' />
        <span>{time}</span>
        <span></span>
        <HourglassTopRoundedIcon titleAccess='Tempo' />
        {
          typeof props.bpm === 'number'
          ? <span>{props.bpm.toFixed(3)} BPM</span>
          : <span title='Tempo utworu zmienia się w czasie'>???</span>
        }
      </SongDetails>
      <SongActions>
        <GreenButton onClick={props.onPlay} disabled={props.stemCount < 1}>
          <PlayArrowRoundedIcon />&nbsp;Odtwarzacz
        </GreenButton>
        <YellowButton onClick={props.onEdit}>
          <EditRoundedIcon />&nbsp;Edytor
        </YellowButton>
        <RedButton onClick={props.onDelete}>
          <DeleteForeverRoundedIcon />&nbsp;Usuń
        </RedButton>
      </SongActions>
    </SongFrame>
  );
}

interface DeleteSongModalProps {
  open?: boolean;
  onCancel?: () => void;
  songId: number;
  songTitle: string;
}


function DeleteSongModal(props: DeleteSongModalProps) {
  const [ processing, setProcessing ] = useState(false);
  const axios = useAxios();
  const session = useSession();
  const queryClient = useQueryClient();

  const handleDelete = () => {
    setProcessing(true);

    axios.delete(`/api/songs/${props.songId}`).then(() => {
      queryClient.invalidateQueries(['songs']);
      setProcessing(false);

      if (props.onCancel) props.onCancel();
    }).catch((error: AxiosError) => {
      setProcessing(false);

      if (error.response) {
        if (error.response.status === 403) {
          session.invalidateSession();
        } else {
          console.error(error);
          alert((error.response.data as Record<string, string>)['message']);
        }
      } else {
        console.error(error);
        alert('Nie można usunąć utworu! Wystąpił nieznany błąd.');
      }
    });
  };

  return (
    <Modal open={props.open} onBlur={props.onCancel} title='Potwierdź usunięcie utworu' buttons={() =>
      <>
        <RedButton onClick={props.onCancel}><CloseRoundedIcon />&nbsp;Nie</RedButton>&nbsp;&nbsp;
        <GreenButton onClick={handleDelete}>
          <CheckRoundedIcon /> { processing ? '\u2022 \u2022 \u2022' : <>&nbsp;Tak</> }
        </GreenButton>
      </>
    }>
      <p>Czy na pewno chcesz usunąć utwór pt. <strong>"{ props.songTitle }"</strong>? Tej operacji nie można cofnąć!</p>
    </Modal>
  );
}

function SongListRoute() {
  const axios = useAxios();
  const queryClient = useQueryClient();
  const { status, data, error } = useQuery(['songs'], async () => {
    const { data } = await axios.get('/api/songs');
    return data;
  }, { staleTime: 60000 });
  const session = useSession();
  const navigate = useNavigate();
  const modalKey = useRef<number>(1);
  const [ addModalOpen, setAddModalOpen ] = useState(false);
  const [ deleteModalSongId, setDeleteModalSongId ] = useState<number | undefined>(undefined);
  const deleteModalSongTitle = useMemo(() => {
    if (deleteModalSongId === undefined) return '';

    for (const entry of data) {
      if (entry.id === deleteModalSongId) {
        return entry.title;
      }
    }

    return '';
  }, [data, deleteModalSongId]);
  
  useEffect(() => {
    if ((error as AxiosError)?.response?.status === 403) {
      session.invalidateSession();
    }
  }, [error, session]);

  const handleAddModalOpen = () => {
    ++modalKey.current;
    setAddModalOpen(true);
  };

  const handleAddModalClose = () => {
    setAddModalOpen(false);
  }

  const handleReload = () => {
    queryClient.invalidateQueries(['songs']);
  };

  const handleSongEdit = (songId: number) => {
    for (const entry of data) {
      if (entry.id === songId) {
        navigate(`edit/${entry.slug}`);
        return;
      }
    }
  };

  const handleSongDelete = (songId: number) => {
    setDeleteModalSongId(songId);
  };

  const handleDeleteModalClose = () => {
    setDeleteModalSongId(undefined);
  };

  return (
    <SolidBackgroundFrame>
      <Navbar title={session.bandName || ''}>
        <GreenButton onClick={handleAddModalOpen}><AddIcon />&nbsp;Stwórz utwór</GreenButton>
        <span style={{ width: 32 }} />
      </Navbar>
      <MainSection>
        <MainHeader>Lista utworów</MainHeader>
        { status === 'loading' && <LoadingBar/> }
        { status === 'error' && <RedButton onClick={handleReload}>Wczytywanie danych nie powiodło się. Ponów próbę.</RedButton> }
        { status === 'success' && reversed<SongResponse>(data).map((element: SongResponse) => (
          <Song
            key={element.id} 
            title={element.title} 
            slug={element.slug} 
            stemCount={element.stemCount} 
            duration={element.duration}
            bpm={element.bpm}
            onEdit={handleSongEdit.bind(null, element.id)}
            onDelete={handleSongDelete.bind(null, element.id)} />
          )
        )}
        { status === 'success' && data.length === 0 && <>Obecnie nie ma w systemie żadnych utworów!</>}
      </MainSection>
      <SongAddEditModal 
        key={modalKey.current} 
        open={addModalOpen} 
        onCancel={handleAddModalClose} />
      <DeleteSongModal 
        key={-modalKey.current} 
        open={deleteModalSongId !== undefined} 
        songId={deleteModalSongId!} 
        songTitle={deleteModalSongTitle} 
        onCancel={handleDeleteModalClose} />
        <Foot />
    </SolidBackgroundFrame>
  );
}

export default SongListRoute;
