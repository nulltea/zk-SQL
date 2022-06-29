import React, {useEffect, useState} from "react";
import Link from 'next/link';
import {useFieldArray, useForm} from 'react-hook-form';
import {
  Grid, GridItem,
  Modal,
  ModalOverlay,
  ModalContent,
  Text,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Spinner,
  Flex, FormControl, Input, FormErrorMessage, Box, Button, Select,
} from '@chakra-ui/react'
import {CardWrapper} from "./CardWrapper";
import {Contract, ethers} from "ethers";
import ZkSQL from "zk-sql/artifacts/contracts/zkSQL.sol/ZkSQL.json";
import {ZkSQL as IZkSQL} from "zk-sql/types/typechain";
import {commitToTable} from "zk-sql/client/client";


const CustomModalOverlay = () => {
  return <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(5px)"/>;
};

export function TablesSelector() {
  const [isLoading, setLoading] = useState(false);
  const [isModalLoading, setModalLoading] = useState(false)
  const [tables, setTables] = useState([]);
  const {
    isOpen: opened,
    onOpen: open,
    onClose: close,
  } = useDisclosure({});
  const {
    handleSubmit,
    register,
    formState: {errors, isSubmitting},
    control
  } = useForm()
  const {fields, append, prepend, remove, swap, move, insert} = useFieldArray({
    control,
    name: "columns",
  });

  useEffect(() => {
    setLoading(true);
    fetch('/api/tables').then((res) => res.json())
      .then((tables) => {
        setTables(tables);
        setLoading(false);
      });
  }, []);

  async function createTable(table: { name: string, columns: {name: string, type: string}[] }) {
    setModalLoading(true);
    let columns = table.columns.map((c) => c.name.trim());
    const contract = new Contract(process.env.NEXT_PUBLIC_ZK_SQL_CONTRACT!, ZkSQL.abi);
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contractOwner = contract.connect(provider.getSigner()) as IZkSQL;
    const commit = await commitToTable(columns)

    await contractOwner.createTable(table.name, commit);
    fetch('/api/table/create', {
      method: 'POST',
      body: JSON.stringify({
        table: table,
        commit: commit.toString()
      })
    }).then(() => {
      setModalLoading(false);
      setTables(tables.concat([table.name]));
      close();
    });
  }

  if (isLoading) return <p>Loading...</p>

  return (
    <>
      <Grid templateColumns='repeat(5, 1fr)' gap={6}>
        {
          tables.map((table) => {
            return <GridItem w='100%' key={table}>
              <CardWrapper h='100px' cursor='pointer'>
                <Link href={`table?name=${table}`}>
                  {table}
                </Link>
              </CardWrapper>
            </GridItem>
          })
        }
        <GridItem w='100%'>
          <CardWrapper h='100px'>
            <Button onClick={open} variant='ghost'>+</Button>
          </CardWrapper>
        </GridItem>
      </Grid>
      <Modal isOpen={opened} size="sm" onClose={close} isCentered>
        <CustomModalOverlay/>
        <ModalContent
          bgColor="dappTemplate.dark.darker"
          px={6}
          pt={7}
          pb={10}
          position="relative"
        >
          <ModalCloseButton _focus={{outline: 'none'}}/>
          <ModalBody>
            <Text textAlign="center" mb={7} fontWeight="black" fontSize="2xl">
              Create table
            </Text>
            {isModalLoading && (
              <Flex
                alignItems="center"
                backdropFilter="blur(3px)"
                bgColor="blackAlpha.700"
                justifyContent="center"
                position="absolute"
                inset={0}
              >
                <Spinner
                  thickness="3px"
                  speed="0.4s"
                  color="dappTemplate.color2.base"
                  size="xl"
                />
              </Flex>
            )}
            <form onSubmit={handleSubmit(createTable)}>
              <FormControl>
                <Input
                  id='name'
                  placeholder='Table name'
                  {...register('name', {
                    required: 'This is required',
                  })}
                />
                <FormErrorMessage>
                  {errors.name && errors.name.message}
                </FormErrorMessage>
              </FormControl>
              <Box h='15px'/>
              {
                fields.map((field, index) => (
                  <Box key={field.id}>
                    <Flex flexDirection='row'>
                      <FormControl>
                        <Input
                          placeholder='Column name'
                          {...register(`columns.${index}.name`, {
                            required: 'This is required',
                          })}
                        />
                        <FormErrorMessage>
                          {errors.columns && errors.columns.message}
                        </FormErrorMessage>
                      </FormControl>
                      <Box w='20px'/>
                      <FormControl>
                        <Select
                          placeholder='Column type'
                          {...register(`columns.${index}.type`, {
                            required: 'This is required',
                          })}
                        >
                          <option value='int'>Int</option>
                          <option value='string'>String</option>
                        </Select>
                      </FormControl>
                    </Flex>
                    <Box h='15px'/>
                  </Box>
                ))
              }
              <Flex flexDirection='column'>
                <Button variant='ghost' onClick={() => append({})}>
                  +
                </Button>
                <Box h='15px'/>
                <Button colorScheme='teal' isLoading={isSubmitting} type='submit'>
                  Submit
                </Button>
              </Flex>
            </form>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}
