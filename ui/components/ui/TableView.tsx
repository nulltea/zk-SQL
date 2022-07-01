import React, {FC, useEffect, useMemo, useState} from "react";
import {useForm} from 'react-hook-form';
import {
  FormErrorMessage,
  FormControl,
  Table,
  Thead,
  Tbody,
  Tr, Th, Td,
  Input,
  Box,
  Flex,
  Button, Spinner, Skeleton, Stack, Text, Center, useToast, ToastId,
} from '@chakra-ui/react'
import {CheckIcon} from "@chakra-ui/icons";
import {useTable} from 'react-table';
import {FlexCardWrapper} from "./CardWrapper";
import ZkSQL from "zk-sql/artifacts/contracts/zkSQL.sol/ZkSQL.json";
import {ZkSQL as IZkSQL} from "zk-sql/types/typechain";
import {Contract, ethers} from "ethers";
import {verifyProof} from "../../utils/verify";
import {UseToastOptions} from "@chakra-ui/toast/dist/declarations/src/use-toast";

interface TableViewProps {
  tableName: string,
  columnNames: any[]
}

export const TableView: FC<TableViewProps> = ({tableName, columnNames}) => {
  const [values, setValues] = useState([]);
  const [tableColumns, setColumns] = useState(columnNames.map(cn => ({
      Header: cn,
      accessor: cn,
      isNumeric: true,
  })));
  const [isLoading, setLoading] = useState(true);
  const [proof, setProof] = useState(null);
  const [publicSignals, setPublicSignals] = useState([]);
  const toast = useToast();
  const toastIdRef = React.useRef<ToastId>();
  const maxRows = Number(process.env.NEXT_PUBLIC_MAX_ROWS!);
  const [numRows, setNumRows] = useState(5);
  let reqMade = 0;


  const data = useMemo(
    () => (isLoading ? Array(numRows).fill({}) : values),
    [isLoading, values]
  );
  const columns = useMemo(
    () =>
      isLoading
        ? tableColumns.map((column) => ({
          ...column,
          Cell: <Skeleton isLoaded={!isLoading} height='25px'></Skeleton>,
        }))
        : tableColumns,
    [isLoading, columnNames]
  );

  const {getTableProps, getTableBodyProps, headerGroups, rows, prepareRow} =
    useTable({columns, data});

  useEffect(() => {
    makeQuery({
      sql: `SELECT * FROM ${tableName}`
    });
  }, []);

  const {
    handleSubmit,
    register,
    formState: {errors, isSubmitting},
  } = useForm()

  async function makeQuery(values: { sql: string }) {
    if (values.sql.toLowerCase().includes("insert")) {
      if (data.length >= maxRows) {
        showFeedback({
          title: "Limit exceeded",
          description: `Prover supports no more than ${maxRows} rows. Contact host or create another table.`,
          status: "warning",
          duration: 6000,
          isClosable: true
        })
        return;
      }

      setNumRows(numRows + 1);
    }
    fetch('/api/table/prepare', {
      method: 'POST',
      body: JSON.stringify({
        sql: values.sql
      })
    }).then((res) => res.json())
      .then(({error, commitExpected, table, commit}) => {
        if (error !== undefined) {
          showFeedback({title: "Error occurred", status: "error", description: error,  duration: 9000});
          return null;
        }
        if (commitExpected) {
          const contract = new Contract(process.env.NEXT_PUBLIC_ZK_SQL_CONTRACT!, ZkSQL.abi);
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const contractOwner = contract.connect(provider.getSigner()) as IZkSQL;
          return contractOwner.request(table, BigInt(commit)).then(() => values.sql);
        }
        return values.sql;
      }).then((sql) => {
      if (sql == null) return;
      setLoading(true);
      showFeedback({title: "Please wait", status: "info", description: "Connecting to the node...", duration: null});
      fetch('/api/table/request', {
        method: 'POST',
        body: JSON.stringify({
          sql
        })
      }).then((res) => res.json())
        .then(({token, tableCommit, error}) => {
          if (error != null) {
            showFeedback({title: "Error occurred", status: "error", description: error,  duration: 9000});
            setLoading(false);
            return;
          }

          showFeedback({description: "Waiting for data."});
          poll(sql, tableCommit, token)
        });
    });
  }

  async function poll(sql: string, tableCommit: string, token: string) {
    let {
      ready,
      error,
      selected,
      type,
      proof,
      publicSignals
    } = await fetch('/api/table/query', {
      method: 'POST',
      body: JSON.stringify({
        token,
        tableCommit,
        sql
      })
    }).then((res) => res.json());

    if (!ready) {
      if (reqMade > 20) {
        setLoading(false);
        showFeedback({title: "Error occurred", status: "error", description: "Request timed out",  duration: 9000});

      }
      reqMade++;
      showFeedback({description: `Waiting for data${[...Array(reqMade % 3+1)].map(_ => ".").join("")}`});
      return new Promise(resolve => setTimeout(resolve, 2000)).then(() => poll(sql, tableCommit, token));
    }

    if (error != null) {
      setLoading(false);
      showFeedback({title: "Error occurred", status: "error", description: error,  duration: 9000});

      return;
    }

    if (selected != null) {
      setValues(selected.values);
      setColumns(selected.columns);
      setNumRows(selected.values.length);
    }

    showFeedback({description: "Verifying proof..."});

    const isVerified = await verifyProof(type, publicSignals, proof);

    if (!isVerified) {
      setLoading(false);
      showFeedback({title: "Error occurred", status: "error", description: "Proof verification failed!",  duration: 9000});
    }

    setProof(proof);
    setPublicSignals(publicSignals);
    setLoading(false);
    setTimeout(function () {
      showFeedback({title: "All done", description: "Proof verified!", status: "success", duration: 8000});
    }, 1000);
  }

  function exportProof() {
    const files: [any, string][] = [[proof, "proof.json"], [publicSignals, "publicSignals.json"]];
    for (const [data, fileName] of files) {
      const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
        JSON.stringify(data)
      )}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = fileName;
      link.click();
    }
  }

  function showFeedback(params: UseToastOptions) {
    if (toastIdRef.current == null) {
      toastIdRef.current = toast(params);
    } else {
      if (typeof params.duration == "number") {
        params.onCloseComplete = () => {toastIdRef.current = null};
      } else {
        params.duration = null;
      }
      toast.update(toastIdRef.current, params);
    }
  }

  return (
    <Box>
      <FlexCardWrapper mb={4}>
        <Table {...getTableProps()}>
          <Thead>
            {headerGroups.map((headerGroup, key) => (
              <Tr {...headerGroup.getHeaderGroupProps()} key={key}>
                {headerGroup.headers.map((column, key) => (
                  <Th {...column.getHeaderProps(column.getHeaderProps())} key={key}>
                    {column.render('Header')}
                  </Th>
                ))}
              </Tr>
            ))}
          </Thead>
          <Tbody {...getTableBodyProps()}>
            {rows.map((row, key) => {
              prepareRow(row)
              return (
                <Tr {...row.getRowProps()} key={key}>
                  {row.cells.map((cell, key) => (
                    <Td {...cell.getCellProps()} key={key}>
                      {cell.render('Cell')}
                    </Td>
                  ))}
                </Tr>
              )
            })}
          </Tbody>
        </Table>
        <Box h='20px'/>
        {proof != null
          ? (<Button leftIcon={<CheckIcon/>} colorScheme='green' onClick={exportProof}>Download proof</Button>)
          : null
        }
      </FlexCardWrapper>
      <Box h='10px'/>
      <form onSubmit={handleSubmit(makeQuery)}>
        <Flex>
          <FormControl>
            <Input variant='filled' backgroundColor='dappTemplate.dark.darker' h='45px'
              id='sql'
              placeholder={`SELECT * FROM ${tableName}`}
              {...register('sql', {
                required: 'This is required',
              })}
            />
            <FormErrorMessage>
              {errors.name && errors.name.message}
            </FormErrorMessage>
          </FormControl>
          <Box w='20px' h='45px'/>
          <Button colorScheme='teal' isLoading={isSubmitting} type='submit'>
            Submit
          </Button>
        </Flex>
      </form>
    </Box>

  )
}
