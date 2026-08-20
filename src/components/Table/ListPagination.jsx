import { Divider, Pagination, TextField, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

import styles from './index.module.scss';

const PageText = styled(Typography)(() => ({
  color: 'var(--color-light-5)',
  fontSize: 14,
}));

const ListPagination = (props) => {
  const { t } = useTranslation();
  const { pagination, onPageChange } = props;
  const { page, count, rowsPerPage } = pagination;

  const totalPage = Math.ceil(count / rowsPerPage) || 1;

  const onGoToPageChange = (event) => {
    if (+event.target.value && +event.target.value <= totalPage) {
      onPageChange(event, +event.target.value);
    }
  };

  return (
    <div className={styles.listPagination}>
      <div>
        <PageText>{`${(page - 1) * rowsPerPage + 1} - ${Math.min(count, page * rowsPerPage)} / ${count}`}</PageText>
      </div>
      <div className={styles.paginationContainer}>
        <div className={styles.pages}>
          <PageText>{t('table_page')}</PageText>
          <Pagination
            count={totalPage}
            page={Math.min(page || 1, totalPage)}
            sx={{
              '& .MuiPaginationItem-root': {
                height: 24,
                minWidth: 24,
                width: 24,
                color: 'var(--color-light-5)',
                '&.Mui-selected': {
                  backgroundColor: 'var(--color-accent-yellow-2)',
                  color: 'white',
                },
              },
            }}
            onChange={onPageChange}
          />
        </div>
        <Divider orientation="vertical" variant="middle" flexItem sx={{ borderColor: '#bdbdbd' }} />
        <div className={styles.goToPage}>
          <PageText>{t('table_go_to_page')}</PageText>
          <TextField
            variant="outlined"
            type="number"
            defaultValue={1}
            inputProps={{ step: 1, min: 1, max: totalPage }}
            onChange={onGoToPageChange}
            sx={{
              height: 30,
              width: 60,
              '& .MuiOutlinedInput-root': {
                height: 30,
                '& input': {
                  textAlign: 'center',
                  color: 'var(--color-light-5)',
                  MozAppearance: 'textfield',
                  '&::-webkit-inner-spin-button': {
                    WebkitAppearance: 'none',
                  },
                },
                '& fieldset': {
                  borderColor: '#e0e0e0',
                  borderWidth: 0.5,
                },
                '&:hover fieldset': {
                  borderColor: '#e0e0e0',
                  borderWidth: 0.5,
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#e0e0e0',
                  borderWidth: 0.5,
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
};
export default ListPagination;
