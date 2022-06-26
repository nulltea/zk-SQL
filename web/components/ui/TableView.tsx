import React, {FC, useEffect, useState} from "react";
import { useForm } from 'react-hook-form';
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
  Button
} from '@chakra-ui/react'
import { useTable } from 'react-table';
import {CardWrapper} from "./CardWrapper";
import ZkSQL from "../../../server/artifacts/contracts/zkSQL.sol/ZkSQL.json";
import {ZkSQL as IZkSQL} from "../../../server/typechain-types";
import {Contract, ethers} from "ethers";

interface LoginModalButtonProps {
  tableName: string
}

export const TableView : FC<LoginModalButtonProps> = ({tableName}) => {
  const [columns, setColumns] = useState([]);
  const [values, setValues] = useState([]);
  const [isLoading, setLoading] = useState(false)

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    useTable({ columns, data: values });

  useEffect(() => {
    makeQuery({sql: `SELECT * FROM ${tableName}`});
  }, []);

  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm()

  async function makeQuery(values: { sql: string }) {
    fetch('/api/table/prepare', {
      method: 'POST',
      body: JSON.stringify({
        sql: values.sql
      })
    }).then((res) => res.json())
      .then(({commitExpected, table, commit}) => {
        if (commitExpected) {
          console.log(process.env.NEXT_PUBLIC_ZK_SQL_CONTRACT!);
          const contract = new Contract(process.env.NEXT_PUBLIC_ZK_SQL_CONTRACT!, ZkSQL.abi);
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const contractOwner = contract.connect(provider.getSigner()) as IZkSQL;
          return contractOwner.request(table, BigInt(commit)).then(() => values.sql);
        }
        return values.sql;
      }).then((sql) => {
        setLoading(true);
        fetch('/api/table/query', {
          method: 'POST',
          body: JSON.stringify({
            sql
          })
        }).then((res) => res.json())
        .then(({selected, changeCommit, proof}) => {
          if (selected != null) {
            setColumns(selected.columns);
            setValues(selected.values);
          }
          setLoading(false)
        });
    });
  }

  if (isLoading) return <p>Loading...</p>

  return (
    <Box>
      <CardWrapper mb={4}>
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
      </CardWrapper>
      <Box h='10px'/>
      <form onSubmit={handleSubmit(makeQuery)}>
        <Flex>
          <FormControl>
            <Input
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
          <Box w='20px'/>
          <Button colorScheme='teal' isLoading={isSubmitting} type='submit'>
            Submit
          </Button>
        </Flex>
      </form>
    </Box>

  )
}
