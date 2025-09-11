const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addUADNumbers() {
  try {
    console.log('Adding UAD numbers to existing UADs...');
    
    // Get all UADs ordered by creation date
    const uads = await prisma.uAD.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`Found ${uads.length} UADs to update`);
    
    // Update each UAD with a sequential number
    for (let i = 0; i < uads.length; i++) {
      const uadNumber = `UAD-${(i + 1).toString().padStart(3, '0')}`;
      
      await prisma.uAD.update({
        where: { id: uads[i].id },
        data: { uadNumber }
      });
      
      console.log(`Updated UAD ${uads[i].id} with number ${uadNumber}`);
    }
    
    console.log('✅ All UAD numbers added successfully!');
  } catch (error) {
    console.error('❌ Error adding UAD numbers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addUADNumbers();
